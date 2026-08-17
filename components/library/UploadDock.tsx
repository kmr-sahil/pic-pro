"use client";

import { useEffect, useRef, useState } from "react";

import {
  AlbumIcon,
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  PlusIcon,
  RetryIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { useUploads } from "@/components/upload/UploadProvider";
import { formatBytes } from "@/lib/format";

type Props = {
  onPickFiles: () => void;
  onNewAlbum: () => void;
};

/**
 * Bottom-right control. A plain "+" when idle; it becomes the upload status
 * bar as soon as there is a queue, and stays until failures are dealt with.
 */
export default function UploadDock({ onPickFiles, onNewAlbum }: Props) {
  const { items, stats, retry, retryFailed, cancel, cancelAll, clearFinished } =
    useUploads();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Collapse the detail list once a clean batch is done.
  useEffect(() => {
    if (items.length === 0) setExpanded(false);
  }, [items.length]);

  if (items.length > 0) {
    const failed = stats.failed + stats.canceled;
    const headline = stats.active
      ? `Uploading ${Math.min(stats.done + 1, stats.total)} of ${stats.total}`
      : failed > 0
        ? `${stats.done} uploaded · ${failed} failed`
        : `${stats.done} uploaded`;

    return (
      <div className="glass w-[min(92vw,25rem)] overflow-hidden rounded-3xl">
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
              {headline}
            </span>
            <span className="block truncate text-[12px] text-muted">
              {stats.active
                ? `${stats.progress}% · tap for details`
                : failed > 0
                  ? "Tap to review and retry"
                  : "All done"}
            </span>
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-muted transition-transform ${
              expanded ? "" : "rotate-180"
            }`}
          />
        </button>

        {expanded && (
          <>
            <ul className="no-scrollbar max-h-64 overflow-y-auto overscroll-contain border-t border-separator">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 border-b border-separator px-3 py-2 last:border-b-0"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-fill text-faint">
                    {item.previewUrl ? (
                      // Local object URL — never worth sending to the optimizer.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UploadIcon className="h-4 w-4" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{item.name}</span>
                    <span
                      className={`block truncate text-[11px] ${
                        item.status === "failed" ? "text-danger" : "text-muted"
                      }`}
                    >
                      {rowStatus(item.status, item.progress, item.error, item.size)}
                    </span>
                    {item.status === "uploading" && (
                      <span className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-fill-strong">
                        <span
                          className="block h-full bg-accent transition-[width] duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </span>
                    )}
                  </span>

                  {item.status === "failed" || item.status === "canceled" ? (
                    <button
                      onClick={() => retry(item.id)}
                      aria-label={`Retry ${item.name}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-accent transition hover:bg-fill"
                    >
                      <RetryIcon className="h-4 w-4" />
                    </button>
                  ) : item.status === "done" ? (
                    <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <button
                      onClick={() => cancel(item.id)}
                      aria-label={`Cancel ${item.name}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-fill"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>

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
        )}

        {!expanded && stats.active && (
          <div className="h-0.5 w-full bg-fill-strong">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative flex flex-col items-end gap-2">
      {menuOpen && (
        <div className="glass w-60 overflow-hidden rounded-2xl text-[15px]">
          <button
            onClick={() => {
              setMenuOpen(false);
              onPickFiles();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-fill"
          >
            <UploadIcon className="h-4.5 w-4.5 text-muted" />
            Upload photos or videos
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onNewAlbum();
            }}
            className="flex w-full items-center gap-3 border-t border-separator px-4 py-3 text-left transition hover:bg-fill"
          >
            <AlbumIcon className="h-4.5 w-4.5 text-muted" />
            New album
          </button>
        </div>
      )}

      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Add photos"
        aria-expanded={menuOpen}
        className="grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-float transition active:scale-95"
      >
        <PlusIcon
          className={`h-6 w-6 transition-transform duration-200 ${
            menuOpen ? "rotate-45" : ""
          }`}
        />
      </button>
    </div>
  );
}

function rowStatus(
  status: string,
  progress: number,
  error: string | null,
  size: number
) {
  if (error) return error;
  if (status === "uploading") return `${progress}% of ${formatBytes(size)}`;
  if (status === "queued") return "Waiting…";
  if (status === "done") return "Uploaded";
  return formatBytes(size);
}

function ProgressRing({
  percent,
  done,
  failed,
}: {
  percent: number;
  done: boolean;
  failed: boolean;
}) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;

  if (done) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white">
        <CheckIcon className="h-4 w-4" />
      </span>
    );
  }
  if (failed) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
        <AlertIcon className="h-4.5 w-4.5" />
      </span>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 -rotate-90">
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke="var(--fill-strong)"
        strokeWidth="3"
      />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
        style={{ transition: "stroke-dashoffset .3s ease" }}
      />
    </svg>
  );
}
