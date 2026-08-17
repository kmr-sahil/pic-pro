"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type UploadStatus =
  | "queued"
  | "waiting"
  | "uploading"
  | "done"
  | "failed"
  | "canceled";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
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

type EnqueueOptions = { folderIds?: string[]; tags?: string[] };

type UploadContextValue = {
  items: UploadItem[];
  stats: UploadStats;
  enqueue: (files: File[] | FileList, options?: EnqueueOptions) => number;
  retry: (id: string) => void;
  retryFailed: () => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
  clearFinished: () => void;
};

const UploadContext = createContext<UploadContextValue | null>(null);

const CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const MAX_BYTES = 2 * 1024 * 1024 * 1024;

const isFinished = (item: UploadItem) =>
  item.status === "done" || item.status === "failed" || item.status === "canceled";

/** Errors that are worth retrying on their own; everything else needs the user. */
class UploadError extends Error {
  transient: boolean;
  constructor(message: string, transient = false) {
    super(message);
    this.transient = transient;
  }
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);

  const filesRef = useRef(new Map<string, File>());
  const xhrRef = useRef(new Map<string, XMLHttpRequest>());
  const runningRef = useRef(new Set<string>());
  const canceledRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }, []);

  /** Uploaded rows arrive through a router refresh; coalesce them so a
   *  200-file batch doesn't trigger 200 server renders. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 1200);
  }, [router]);

  const upload = useCallback(
    async (item: UploadItem) => {
      const file = filesRef.current.get(item.id);
      if (!file) throw new UploadError("File is no longer available.");

      // 1. Ask the server for a presigned PUT.
      let presign: Response;
      try {
        presign = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            size: file.size,
          }),
        });
      } catch {
        throw new UploadError("No connection.", true);
      }
      if (!presign.ok) {
        throw new UploadError(
          await readError(presign, "Couldn't prepare the upload."),
          presign.status >= 500
        );
      }
      const { uploadUrl, fileKey } = await presign.json();

      // 2. Stream the bytes straight to storage.
      await putWithProgress(uploadUrl, file, item.id, xhrRef.current, (pct) =>
        patch(item.id, { progress: pct })
      );

      // 3. Record it in the library.
      let save: Response;
      try {
        save = await fetch("/api/save-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            size: file.size,
            storageKey: fileKey,
            folderIds: item.folderIds,
            tags: item.tags,
          }),
        });
      } catch {
        throw new UploadError("Uploaded, but saving failed.", true);
      }
      if (!save.ok) {
        throw new UploadError(
          await readError(save, "Couldn't save to your library."),
          save.status >= 500
        );
      }
    },
    [patch]
  );

  const run = useCallback(
    async (item: UploadItem) => {
      runningRef.current.add(item.id);
      patch(item.id, { status: "uploading", progress: 0, error: null });

      try {
        await upload(item);
        patch(item.id, { status: "done", progress: 100, error: null });
        scheduleRefresh();
      } catch (err) {
        const attempt = item.attempt + 1;

        if (canceledRef.current.has(item.id)) {
          patch(item.id, { status: "canceled", error: "Canceled." });
        } else if (
          err instanceof UploadError &&
          err.transient &&
          attempt < MAX_ATTEMPTS
        ) {
          // Hold the item out of the scheduler while it backs off.
          patch(item.id, {
            status: "waiting",
            attempt,
            progress: 0,
            error: `${err.message} Retrying…`,
          });
          const delay = 800 * 2 ** (attempt - 1);
          setTimeout(() => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id && i.status === "waiting"
                  ? { ...i, status: "queued" }
                  : i
              )
            );
          }, delay);
        } else {
          patch(item.id, {
            status: "failed",
            attempt,
            error: err instanceof Error ? err.message : "Upload failed.",
          });
        }
      } finally {
        runningRef.current.delete(item.id);
        // Free the slot and let the scheduler pick up the next item.
        setItems((prev) => [...prev]);
      }
    },
    [patch, scheduleRefresh, upload]
  );

  // Scheduler: keep CONCURRENCY uploads in flight, in the order queued.
  useEffect(() => {
    for (const item of items) {
      if (runningRef.current.size >= CONCURRENCY) break;
      if (item.status !== "queued") continue;
      if (runningRef.current.has(item.id)) continue;
      void run(item);
    }
  }, [items, run]);

  const enqueue = useCallback(
    (input: File[] | FileList, options: EnqueueOptions = {}) => {
      const files = Array.from(input);
      if (files.length === 0) return 0;

      const next: UploadItem[] = files.map((file) => {
        const id =
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        filesRef.current.set(id, file);

        const rejection = validate(file);
        return {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
          status: rejection ? "failed" : "queued",
          progress: 0,
          error: rejection,
          attempt: 0,
          folderIds: options.folderIds ?? [],
          tags: options.tags ?? [],
        };
      });

      setItems((prev) => [...prev, ...next]);
      return next.length;
    },
    []
  );

  const retry = useCallback(
    (id: string) => {
      if (validate(filesRef.current.get(id))) return;
      canceledRef.current.delete(id);
      patch(id, { status: "queued", attempt: 0, progress: 0, error: null });
    },
    [patch]
  );

  const retryFailed = useCallback(() => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.status !== "failed" && item.status !== "canceled") return item;
        // A file rejected before it ever started can't be fixed by retrying.
        if (validate(filesRef.current.get(item.id))) return item;
        canceledRef.current.delete(item.id);
        return { ...item, status: "queued", attempt: 0, progress: 0, error: null };
      })
    );
  }, []);

  const cancel = useCallback(
    (id: string) => {
      canceledRef.current.add(id);
      xhrRef.current.get(id)?.abort();
      patch(id, { status: "canceled", error: "Canceled." });
    },
    [patch]
  );

  const cancelAll = useCallback(() => {
    for (const item of items) {
      if (isFinished(item)) continue;
      canceledRef.current.add(item.id);
      xhrRef.current.get(item.id)?.abort();
    }
    setItems((prev) =>
      prev.map((item) =>
        isFinished(item) ? item : { ...item, status: "canceled", error: "Canceled." }
      )
    );
  }, [items]);

  const clearFinished = useCallback(() => {
    for (const item of items) {
      if (!isFinished(item)) continue;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      filesRef.current.delete(item.id);
      xhrRef.current.delete(item.id);
      canceledRef.current.delete(item.id);
    }
    setItems((prev) => prev.filter((item) => !isFinished(item)));
  }, [items]);

  const stats = useMemo<UploadStats>(() => {
    let done = 0;
    let failed = 0;
    let canceled = 0;
    let pending = 0;
    let weight = 0;
    let moved = 0;

    for (const item of items) {
      const share = Math.max(item.size, 1);
      weight += share;
      if (item.status === "done") {
        done++;
        moved += share;
      } else if (item.status === "failed") {
        failed++;
      } else if (item.status === "canceled") {
        canceled++;
      } else {
        pending++;
        if (item.status === "uploading") moved += (share * item.progress) / 100;
      }
    }

    return {
      total: items.length,
      done,
      failed,
      canceled,
      pending,
      progress: weight === 0 ? 0 : Math.round((moved / weight) * 100),
      active: pending > 0,
    };
  }, [items]);

  // Batch settled: pull the new photos in, and tidy up if nothing went wrong.
  useEffect(() => {
    if (items.length === 0 || stats.pending > 0) return;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (stats.done > 0) router.refresh();

    if (stats.failed === 0 && stats.canceled === 0) {
      const timer = setTimeout(clearFinished, 2500);
      return () => clearTimeout(timer);
    }
  }, [
    items.length,
    stats.pending,
    stats.done,
    stats.failed,
    stats.canceled,
    router,
    clearFinished,
  ]);

  // Don't let a half-finished batch disappear with the tab.
  useEffect(() => {
    if (!stats.active) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [stats.active]);

  const value = useMemo<UploadContextValue>(
    () => ({
      items,
      stats,
      enqueue,
      retry,
      retryFailed,
      cancel,
      cancelAll,
      clearFinished,
    }),
    [items, stats, enqueue, retry, retryFailed, cancel, cancelAll, clearFinished]
  );

  return <UploadContext value={value}>{children}</UploadContext>;
}

export function useUploads() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploads must be used inside <UploadProvider>");
  return ctx;
}

function validate(file: File | undefined): string | null {
  if (!file) return "File is no longer available.";
  if (!/^(image|video)\//.test(file.type)) return "Not a photo or video.";
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_BYTES) return "Larger than 2 GB.";
  return null;
}

async function readError(res: Response, fallback: string) {
  if (res.status === 401) return "Signed out. Sign in again to continue.";
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Not JSON — fall through to the generic message.
  }
  return `${fallback} (${res.status})`;
}

function putWithProgress(
  url: string,
  file: File,
  id: string,
  registry: Map<string, XMLHttpRequest>,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    registry.set(id, xhr);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    const settle = (fn: () => void) => {
      registry.delete(id);
      fn();
    };
    xhr.onload = () =>
      settle(() => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else if (xhr.status === 403)
          reject(new UploadError("Upload link expired.", true));
        else
          reject(
            new UploadError(
              `Storage rejected the file (${xhr.status}).`,
              xhr.status >= 500
            )
          );
      });
    xhr.onerror = () =>
      settle(() => reject(new UploadError("Connection lost.", true)));
    xhr.ontimeout = () => settle(() => reject(new UploadError("Timed out.", true)));
    xhr.onabort = () => settle(() => reject(new UploadError("Canceled.")));
    xhr.send(file);
  });
}
