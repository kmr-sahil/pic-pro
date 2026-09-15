"use client";

import { memo } from "react";

import { useHydrated } from "@/components/library/useHydrated";
import { useLongPress } from "@/components/library/useLongPress";
import { CheckIcon, PhotosIcon, PlayIcon } from "@/components/ui/icons";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { MediaItem } from "@/lib/types";

type Props = {
  item: MediaItem;
  selecting: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onLongPress: (id: string) => void;
};

/** Drive-style row: icon, name, date, size — no media is fetched. */
function FileRow({ item, selecting, selected, onOpen, onToggle, onLongPress }: Props) {
  const { handlers, longPressed } = useLongPress(() => onLongPress(item.id));
  const hydrated = useHydrated();
  const isVideo = item.fileType.startsWith("video/");
  const when = formatDateTime(item.createdAt, hydrated);

  return (
    <button
      type="button"
      {...handlers}
      onClick={() => {
        if (longPressed.current) return;
        if (selecting) onToggle(item.id);
        else onOpen(item.id);
      }}
      aria-label={item.fileName}
      aria-pressed={selecting ? selected : undefined}
      className={`flex w-full items-center gap-3 border-b border-separator px-3 py-2.5 text-left transition select-none hover:bg-fill active:bg-fill-strong ${
        selected ? "bg-fill" : ""
      }`}
    >
      {selecting ? (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center"
          aria-hidden="true"
        >
          <span
            className={`grid h-5.5 w-5.5 place-items-center rounded-full border transition ${
              selected
                ? "border-transparent bg-accent text-white"
                : "border-faint"
            }`}
          >
            {selected && <CheckIcon className="h-3.5 w-3.5" />}
          </span>
        </span>
      ) : (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fill ${
            isVideo ? "text-danger" : "text-accent"
          }`}
        >
          {isVideo ? (
            <PlayIcon className="h-4.5 w-4.5" />
          ) : (
            <PhotosIcon className="h-5 w-5" />
          )}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px]">{item.fileName}</span>
        <span className="block truncate text-[12px] text-muted sm:hidden">
          {when} · {formatBytes(item.size)}
        </span>
      </span>

      <span className="hidden w-48 shrink-0 truncate text-[13px] text-muted sm:block">
        {when}
      </span>
      <span className="hidden w-20 shrink-0 text-right text-[13px] text-muted tabular-nums sm:block">
        {formatBytes(item.size)}
      </span>
    </button>
  );
}

export default memo(FileRow);
