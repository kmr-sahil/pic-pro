/** Shapes shared by the upload provider and the upload UI. */

export type UploadStatus =
  | "queued" // waiting for a free slot
  | "waiting" // backing off before an automatic retry
  | "uploading"
  | "done"
  | "failed"
  | "canceled";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  /** MIME type, inferred from the extension when the browser leaves it blank. */
  type: string;
  previewUrl: string | null;
  status: UploadStatus;
  progress: number;
  error: string | null;
  /** Attempts made so far, including automatic retries. */
  attempt: number;
  folderIds: string[];
  tags: string[];
};

export type UploadStats = {
  total: number;
  done: number;
  failed: number;
  canceled: number;
  pending: number;
  /** 0-100, weighted by file size across the whole batch. */
  progress: number;
  active: boolean;
};

export type EnqueueOptions = { folderIds?: string[]; tags?: string[] };

export type UploadContextValue = {
  items: UploadItem[];
  stats: UploadStats;
  enqueue: (files: File[] | FileList, options?: EnqueueOptions) => number;
  retry: (id: string) => void;
  retryFailed: () => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
  clearFinished: () => void;
};
