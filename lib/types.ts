/** Shapes shared between the server queries and the client components. */

export type MediaItem = {
  id: string;
  fileName: string;
  fileType: string;
  size: number;
  url: string;
  createdAt: string;
  folderIds: string[];
  tags: string[];
};

export type FolderSummary = {
  id: string;
  name: string;
  count: number;
  /** Cover image url, newest item in the folder. */
  cover: string | null;
};

export type TagSummary = {
  name: string;
  count: number;
};

export type LibraryData = {
  items: MediaItem[];
  folders: FolderSummary[];
  tags: TagSummary[];
};

/** What the grid is currently showing. */
export type Collection =
  | { kind: "all" }
  | { kind: "videos" }
  | { kind: "folder"; id: string }
  | { kind: "tag"; name: string };

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };
