"use client";

/**
 * Upload queue for the whole app.
 *
 * Holds the list of uploads in React state and runs up to CONCURRENCY at a
 * time. The network work lives in ./transfer, validation in ./fileType, and
 * the batch summary in ./stats — this file only wires them to React.
 */

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

import {
  CLEAR_AFTER_MS,
  CONCURRENCY,
  MAX_ATTEMPTS,
  REFRESH_DEBOUNCE_MS,
  RETRY_BASE_DELAY_MS,
} from "./config";
import { UploadError } from "./errors";
import { resolveType, validate } from "./fileType";
import { computeStats, isFinished } from "./stats";
import { uploadFile } from "./transfer";
import type { EnqueueOptions, UploadContextValue, UploadItem } from "./types";

export type { UploadItem, UploadStats, UploadStatus } from "./types";

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);

  // Per-upload data that shouldn't cause re-renders, keyed by item id.
  const filesRef = useRef(new Map<string, File>());
  const controllersRef = useRef(new Map<string, AbortController>());
  /** S3 keys whose bytes already landed, so a retry only re-saves. */
  const storedKeysRef = useRef(new Map<string, string>());
  const runningRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Every preview url we minted, so none survives the provider. */
  const previewUrlsRef = useRef(new Set<string>());

  // Object urls pin their blob until revoked, and clearFinished only reaches
  // rows the user actually cleared. Release the rest when we go away.
  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
      previewUrlsRef.current.clear();
    },
    []
  );

  // ─── State helpers ──────────────────────────────────────────────────────

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }, []);

  /** New rows arrive via a router refresh; debounce so a big batch doesn't
   *  trigger one server render per file. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [router]);

  /** Retry a transient failure after a backoff, or mark it failed for good. */
  const handleFailure = useCallback(
    (item: UploadItem, err: unknown) => {
      const attempt = item.attempt + 1;
      const retryable =
        err instanceof UploadError && err.transient && attempt < MAX_ATTEMPTS;

      if (!retryable) {
        patch(item.id, {
          status: "failed",
          attempt,
          error: err instanceof Error ? err.message : "Upload failed.",
        });
        return;
      }

      // "waiting" keeps the scheduler from picking it up during the backoff.
      patch(item.id, {
        status: "waiting",
        attempt,
        progress: 0,
        error: `${(err as Error).message} Retrying…`,
      });
      setTimeout(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id && i.status === "waiting" ? { ...i, status: "queued" } : i
          )
        );
      }, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    },
    [patch]
  );

  // ─── Running one upload ─────────────────────────────────────────────────

  const run = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController();
      runningRef.current.add(item.id);
      controllersRef.current.set(item.id, controller);
      patch(item.id, { status: "uploading", progress: 0, error: null });

      try {
        const file = filesRef.current.get(item.id);
        if (!file) throw new UploadError("File is no longer available.");

        await uploadFile(
          { file, type: item.type, folderIds: item.folderIds, tags: item.tags },
          {
            signal: controller.signal,
            storedKey: storedKeysRef.current.get(item.id),
            onStored: (key) => storedKeysRef.current.set(item.id, key),
            onProgress: (progress) => patch(item.id, { progress }),
          }
        );

        storedKeysRef.current.delete(item.id);
        patch(item.id, { status: "done", progress: 100, error: null });
        scheduleRefresh();
      } catch (err) {
        if (controller.signal.aborted) {
          patch(item.id, { status: "canceled", error: "Canceled." });
        } else {
          handleFailure(item, err);
        }
      } finally {
        runningRef.current.delete(item.id);
        controllersRef.current.delete(item.id);
        // Touch state so the scheduler notices the free slot.
        setItems((prev) => [...prev]);
      }
    },
    [patch, scheduleRefresh, handleFailure]
  );

  // Scheduler: keep CONCURRENCY uploads in flight, in the order queued.
  useEffect(() => {
    for (const item of items) {
      if (runningRef.current.size >= CONCURRENCY) break;
      if (item.status !== "queued" || runningRef.current.has(item.id)) continue;
      void run(item);
    }
  }, [items, run]);

  // ─── Public actions ─────────────────────────────────────────────────────

  const enqueue = useCallback((input: File[] | FileList, options: EnqueueOptions = {}) => {
    // Copy first: some browsers empty a FileList once its input is reset.
    const files = Array.from(input);
    if (files.length === 0) return 0;

    const next = files.map((file): UploadItem => {
      const id = createId();
      filesRef.current.set(id, file);

      const type = resolveType(file);
      const rejection = validate(file);

      // Only images preview; a video would have to be decoded to show one.
      let previewUrl: string | null = null;
      if (!rejection && type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
      }

      return {
        id,
        name: file.name,
        size: file.size,
        type,
        previewUrl,
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
  }, []);

  const retry = useCallback(
    (id: string) => {
      // A file rejected before it ever started can't be fixed by retrying.
      if (validate(filesRef.current.get(id))) return;
      patch(id, { status: "queued", attempt: 0, progress: 0, error: null });
    },
    [patch]
  );

  const retryFailed = useCallback(() => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.status !== "failed" && item.status !== "canceled") return item;
        if (validate(filesRef.current.get(item.id))) return item;
        return { ...item, status: "queued", attempt: 0, progress: 0, error: null };
      })
    );
  }, []);

  const cancel = useCallback(
    (id: string) => {
      controllersRef.current.get(id)?.abort();
      patch(id, { status: "canceled", error: "Canceled." });
    },
    [patch]
  );

  const cancelAll = useCallback(() => {
    for (const controller of controllersRef.current.values()) controller.abort();
    setItems((prev) =>
      prev.map((item) =>
        isFinished(item) ? item : { ...item, status: "canceled", error: "Canceled." }
      )
    );
  }, []);

  const clearFinished = useCallback(() => {
    for (const item of items) {
      if (!isFinished(item)) continue;
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current.delete(item.previewUrl);
      }
      filesRef.current.delete(item.id);
      storedKeysRef.current.delete(item.id);
    }
    setItems((prev) => prev.filter((item) => !isFinished(item)));
  }, [items]);

  // ─── Batch lifecycle ────────────────────────────────────────────────────

  const stats = useMemo(() => computeStats(items), [items]);

  // Batch settled: pull the new photos in, and tidy up if nothing went wrong.
  useEffect(() => {
    if (items.length === 0 || stats.pending > 0) return;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (stats.done > 0) router.refresh();

    if (stats.failed === 0 && stats.canceled === 0) {
      const timer = setTimeout(clearFinished, CLEAR_AFTER_MS);
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

  // ─── Context ────────────────────────────────────────────────────────────

  const value = useMemo<UploadContextValue>(
    () => ({ items, stats, enqueue, retry, retryFailed, cancel, cancelAll, clearFinished }),
    [items, stats, enqueue, retry, retryFailed, cancel, cancelAll, clearFinished]
  );

  return <UploadContext value={value}>{children}</UploadContext>;
}

export function useUploads() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploads must be used inside <UploadProvider>");
  return ctx;
}

function createId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
