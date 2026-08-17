import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { fileName, fileType, size, storageKey } = body;
  if (!fileName || !fileType || !size || !storageKey) {
    return NextResponse.json({ error: "Missing file details" }, { status: 400 });
  }

  // The key is minted per-session in /api/upload-url; refuse anything that
  // claims to live under another user's prefix.
  if (!String(storageKey).startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  const folderIds: string[] = Array.isArray(body.folderIds)
    ? body.folderIds.map(String)
    : [];

  const rawTags: unknown[] = Array.isArray(body.tags) ? body.tags : [];
  const tagNames: string[] = [
    ...new Set(
      rawTags
        .map((tag) => String(tag).trim().toLowerCase().slice(0, 40))
        .filter((tag) => tag.length > 0)
    ),
  ];

  const file = await db.file.create({
    data: { userId, fileName, fileType, size, storageKey },
  });

  if (folderIds.length > 0) {
    const folders = await db.folder.findMany({
      where: { userId, id: { in: folderIds } },
      select: { id: true },
    });
    await db.folderItem.createMany({
      data: folders.map((f) => ({ folderId: f.id, fileId: file.id })),
      skipDuplicates: true,
    });
  }

  if (tagNames.length > 0) {
    await db.tag.createMany({
      data: tagNames.map((name) => ({ userId, name })),
      skipDuplicates: true,
    });
    const tags = await db.tag.findMany({
      where: { userId, name: { in: tagNames } },
      select: { id: true },
    });
    await db.fileTag.createMany({
      data: tags.map((tag) => ({ fileId: file.id, tagId: tag.id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ id: file.id }, { status: 201 });
}
