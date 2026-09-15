"use client";

import { useState } from "react";

import ProgressRing from "@/components/library/upload-dock/ProgressRing";
import UploadRow from "@/components/library/upload-dock/UploadRow";
import { ChevronDownIcon, PlusIcon, RetryIcon } from "@/components/ui/icons";
import { useUploads, type UploadStats } from "@/components/upload/UploadProvider";

/**
 * Status bar for the current batch. Tap to expand into the per-file list.
 * Unmounts when the batch is cleared, which also resets `expanded`.
 */
export default function UploadPanel({ onPickFiles }: { onPickFiles: () => void }) {
  const { items, stats, retry, retryFailed, cancel, cancelAll, clearFinished } =
    useUploads();
  const [expanded, setExpanded] = useState(false);
  const failed = stats.failed + stats.canceled;

  return (
    <div className="glass w-[min(92vw,25rem)] overflow-hidden rounded-3xl">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <ProgressRing
          percent={stats.progress}
          done={!stats.active && failed === 0}
          failed={!stats.active && failed > 0}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">
            {headline(stats, failed)}
          </span>
          <span className="block truncate text-[12px] text-muted">
            {subline(stats, failed)}
          </span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${
            expanded ? "" : "rotate-180"
          }`}
        />
      </button>

      {expanded ? (
        <>
          {/* Per-file list */}
          <ul className="no-scrollbar max-h-64 overflow-y-auto overscroll-contain border-t border-separator">
            {items.map((item) => (
              <UploadRow key={item.id} item={item} onRetry={retry} onCancel={cancel} />
            ))}
          </ul>

          {/* Batch actions */}
          <div className="flex items-center gap-2 border-t border-separator px-3 py-2">
            {failed > 0 && (
              <button
                onClick={retryFailed}
                className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition active:scale-95"
              >
                <RetryIcon className="h-3.5 w-3.5" />
                Retry {failed}
              </button>
            )}
            {stats.active && (
              <button
                onClick={cancelAll}
                className="rounded-full bg-fill px-3 py-1.5 text-[13px] text-muted transition hover:bg-fill-strong"
              >
                Cancel all
              </button>
            )}
            <button
              onClick={onPickFiles}
              className="flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-[13px] text-muted transition hover:bg-fill-strong"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add more
            </button>
            <button
              onClick={clearFinished}
              className="ml-auto rounded-full px-3 py-1.5 text-[13px] text-muted transition hover:bg-fill"
            >
              Clear
            </button>
          </div>
        </>
      ) : (
        stats.active && (
          // Thin progress bar under the collapsed summary.
          <div className="h-0.5 w-full bg-fill-strong">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        )
      )}
    </div>
  );
}

function headline(stats: UploadStats, failed: number): string {
  if (stats.active) return `Uploading ${Math.min(stats.done + 1, stats.total)} of ${stats.total}`;
  if (failed > 0) return `${stats.done} uploaded · ${failed} failed`;
  return `${stats.done} uploaded`;
}

function subline(stats: UploadStats, failed: number): string {
  if (stats.active) return `${stats.progress}% · tap for details`;
  if (failed > 0) return "Tap to review and retry";
  return "All done";
}
