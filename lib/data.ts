import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicUrl } from "@/lib/s3";
import type {
  FolderSummary,
  LibraryData,
  MediaItem,
  TagSummary,
} from "@/lib/types";

/** Every query and mutation goes through this — never trust an id from the client. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getLibrary(userId: string): Promise<LibraryData> {
  const [files, folders] = await Promise.all([
    db.file.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        folders: { select: { folderId: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    db.folder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: MediaItem[] = files.map((file) => ({
    id: file.id,
    fileName: file.fileName,
    fileType: file.fileType,
    size: file.size,
    url: getPublicUrl(file.storageKey),
    createdAt: file.createdAt.toISOString(),
    folderIds: file.folders.map((f) => f.folderId),
    tags: file.tags.map((t) => t.tag.name).sort(),
  }));

  // Counts and covers come from the items we already have in memory, so
  // adding a photo to an album never costs an extra round trip.
  const folderSummaries: FolderSummary[] = folders.map((folder) => {
    const members = items.filter((item) => item.folderIds.includes(folder.id));
    const cover = members.find((item) => item.fileType.startsWith("image/"));
    return {
      id: folder.id,
      name: folder.name,
      count: members.length,
      cover: cover?.url ?? members[0]?.url ?? null,
    };
  });

  const tagCounts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const tags: TagSummary[] = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { items, folders: folderSummaries, tags };
}
