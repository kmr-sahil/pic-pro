"use server";

import { refresh } from "next/cache";

import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/data";
import { deleteObjects } from "@/lib/s3";
import type { ActionResult } from "@/lib/types";

const MAX_NAME = 60;
const MAX_TAG = 40;

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function cleanFolderName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

/** Tags are case-insensitive: "Beach" and "beach" are the same tag. */
function cleanTag(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[,\n\r\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, MAX_TAG);
}

/** Narrows a client-supplied list of file ids to the ones this user owns. */
async function ownedFileIds(userId: string, fileIds: string[]) {
  const rows = await db.file.findMany({
    where: { userId, id: { in: fileIds } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function createFolder(
  name: string
): Promise<ActionResult<{ id: string; name: string }>> {
  const userId = await requireUserId();
  const clean = cleanFolderName(name);
  if (!clean) return fail("Album name can't be empty.");

  const existing = await db.folder.findFirst({
    where: { userId, name: clean },
    select: { id: true, name: true },
  });
  if (existing) return fail(`"${clean}" already exists.`);

  const folder = await db.folder.create({
    data: { userId, name: clean },
    select: { id: true, name: true },
  });

  refresh();
  return ok(folder);
}

export async function renameFolder(
  folderId: string,
  name: string
): Promise<ActionResult> {
  const userId = await requireUserId();
  const clean = cleanFolderName(name);
  if (!clean) return fail("Album name can't be empty.");

  const { count } = await db.folder.updateMany({
    where: { id: folderId, userId },
    data: { name: clean },
  });
  if (count === 0) return fail("Album not found.");

  refresh();
  return ok(null);
}

/** Deletes the album only — the photos inside stay in the library. */
export async function deleteFolder(folderId: string): Promise<ActionResult> {
  const userId = await requireUserId();

  const { count } = await db.folder.deleteMany({ where: { id: folderId, userId } });
  if (count === 0) return fail("Album not found.");

  refresh();
  return ok(null);
}

export async function addToFolder(
  fileIds: string[],
  folderId: string
): Promise<ActionResult<{ added: number }>> {
  const userId = await requireUserId();

  const folder = await db.folder.findFirst({
    where: { id: folderId, userId },
    select: { id: true },
  });
  if (!folder) return fail("Album not found.");

  const owned = await ownedFileIds(userId, fileIds);
  if (owned.length === 0) return fail("Nothing to add.");

  const result = await db.folderItem.createMany({
    data: owned.map((fileId) => ({ folderId, fileId })),
    skipDuplicates: true,
  });

  refresh();
  return ok({ added: result.count });
}

export async function removeFromFolder(
  fileIds: string[],
  folderId: string
): Promise<ActionResult> {
  const userId = await requireUserId();

  const folder = await db.folder.findFirst({
    where: { id: folderId, userId },
    select: { id: true },
  });
  if (!folder) return fail("Album not found.");

  const owned = await ownedFileIds(userId, fileIds);
  await db.folderItem.deleteMany({
    where: { folderId, fileId: { in: owned } },
  });

  refresh();
  return ok(null);
}

export async function addTags(
  fileIds: string[],
  tagNames: string[]
): Promise<ActionResult> {
  const userId = await requireUserId();

  const names = [...new Set(tagNames.map(cleanTag).filter(Boolean))];
  if (names.length === 0) return fail("Enter at least one tag.");

  const owned = await ownedFileIds(userId, fileIds);
  if (owned.length === 0) return fail("Nothing to tag.");

  await db.tag.createMany({
    data: names.map((name) => ({ userId, name })),
    skipDuplicates: true,
  });

  const tags = await db.tag.findMany({
    where: { userId, name: { in: names } },
    select: { id: true },
  });

  await db.fileTag.createMany({
    data: owned.flatMap((fileId) => tags.map((tag) => ({ fileId, tagId: tag.id }))),
    skipDuplicates: true,
  });

  refresh();
  return ok(null);
}

export async function removeTag(
  fileIds: string[],
  tagName: string
): Promise<ActionResult> {
  const userId = await requireUserId();

  const name = cleanTag(tagName);
  const tag = await db.tag.findFirst({
    where: { userId, name },
    select: { id: true },
  });
  if (!tag) return fail("Tag not found.");

  const owned = await ownedFileIds(userId, fileIds);
  await db.fileTag.deleteMany({
    where: { tagId: tag.id, fileId: { in: owned } },
  });

  await pruneTag(tag.id);
  refresh();
  return ok(null);
}

/** Removes a tag from the whole library. */
export async function deleteTag(tagName: string): Promise<ActionResult> {
  const userId = await requireUserId();

  const name = cleanTag(tagName);
  const { count } = await db.tag.deleteMany({ where: { userId, name } });
  if (count === 0) return fail("Tag not found.");

  refresh();
  return ok(null);
}

/** Drop a tag once nothing references it, so the tag list stays tidy. */
async function pruneTag(tagId: string) {
  const remaining = await db.fileTag.count({ where: { tagId } });
  if (remaining === 0) {
    await db.tag.deleteMany({ where: { id: tagId } });
  }
}

export async function deleteFiles(
  fileIds: string[]
): Promise<ActionResult<{ deleted: number }>> {
  const userId = await requireUserId();

  const files = await db.file.findMany({
    where: { userId, id: { in: fileIds } },
    select: { id: true, storageKey: true },
  });
  if (files.length === 0) return fail("Nothing to delete.");

  await db.file.deleteMany({ where: { userId, id: { in: files.map((f) => f.id) } } });
  await deleteObjects(files.map((f) => f.storageKey));

  // Tags that only lived on the deleted files would otherwise linger.
  await db.tag.deleteMany({ where: { userId, files: { none: {} } } });

  refresh();
  return ok({ deleted: files.length });
}
