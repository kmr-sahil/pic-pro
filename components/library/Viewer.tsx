"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import {
  AlbumIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  TagIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { formatBytes, formatDateTime } from "@/lib/format";
import { isOptimizable, type MediaItem } from "@/lib/types";

type Props = {
  items: MediaItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onAlbums: (id: string) => void;
  onTags: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function Viewer({
  items,
  index,
  onIndexChange,
  onClose,
  onAlbums,
  onTags,
  onDelete,
}: Props) {
  const item = items[index];
  const [chrome, setChrome] = useState(true);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndexChange]);

  // Keep the page behind from scrolling while the viewer is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!item) return null;
  const isVideo = item.fileType.startsWith("video/");

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-black"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        touchStart.current = null;

        if (Math.abs(dy) > Math.abs(dx) && dy > 90) return onClose();
        if (Math.abs(dx) < 60) return;
        if (dx < 0 && index < items.length - 1) onIndexChange(index + 1);
        if (dx > 0 && index > 0) onIndexChange(index - 1);
      }}
    >
      <div
        className="relative flex-1 min-h-0"
        onClick={() => setChrome((v) => !v)}
      >
        {isVideo ? (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <Image
            key={item.id}
            src={item.url}
            alt={item.fileName}
            fill
            sizes="100vw"
            priority
            unoptimized={!isOptimizable(item.fileType)}
            className="object-contain"
          />
        )}

        {index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index - 1);
            }}
            aria-label="Previous"
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full p-3 text-white/80 transition hover:bg-white/10 hover:text-white sm:block"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        )}
        {index < items.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index + 1);
            }}
            aria-label="Next"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full p-3 text-white/80 transition hover:bg-white/10 hover:text-white sm:block"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Top bar */}
      <div
        className={`absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))] transition-opacity duration-200 ${
          chrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition active:scale-95"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="flex-1 pt-1 text-center text-white">
          <p className="truncate text-[13px] font-medium">{item.fileName}</p>
          <p className="text-[11px] text-white/60">
            {formatDateTime(item.createdAt)} · {formatBytes(item.size)}
          </p>
        </div>

        <span className="w-9 pt-2 text-right text-[11px] text-white/60">
          {index + 1}/{items.length}
        </span>
      </div>

      {/* Bottom bar: tags on this item, plus the per-item actions. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/70 to-transparent p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-200 ${
          chrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {item.tags.length > 0 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[12px] text-white backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <ViewerAction
            icon={<AlbumIcon className="h-5 w-5" />}
            label="Albums"
            onClick={() => onAlbums(item.id)}
          />
          <ViewerAction
            icon={<TagIcon className="h-5 w-5" />}
            label="Tags"
            onClick={() => onTags(item.id)}
          />
          <ViewerAction
            icon={<TrashIcon className="h-5 w-5" />}
            label="Delete"
            danger
            onClick={() => onDelete(item.id)}
          />
        </div>
      </div>
    </div>
  );
}

function ViewerAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 max-w-32 flex-col items-center gap-1 rounded-2xl bg-white/10 py-2 text-[11px] backdrop-blur transition hover:bg-white/20 active:scale-95 ${
        danger ? "text-danger" : "text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
