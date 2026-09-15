"use client";

import Image from "next/image";
import { memo } from "react";

import { useLongPress } from "@/components/library/useLongPress";
import { CheckIcon, PlayIcon } from "@/components/ui/icons";
import type { MediaItem } from "@/lib/types";

const SIZES = "(max-width: 640px) 34vw, (max-width: 1024px) 22vw, 14vw";

type Props = {
  item: MediaItem;
  selecting: boolean;
  selected: boolean;
  priority: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onLongPress: (id: string) => void;
};

function PhotoTile({
  item,
  selecting,
  selected,
  priority,
  onOpen,
  onToggle,
  onLongPress,
}: Props) {
  const { handlers, longPressed } = useLongPress(() => onLongPress(item.id));
  const isVideo = item.fileType.startsWith("video/");

  return (
    <div className="relative">
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
        className="group relative block w-full aspect-square overflow-hidden bg-fill select-none"
      >
        {/* Selected tiles shrink back, the way Photos does it. */}
        <span
          className={`absolute inset-0 overflow-hidden transition-transform duration-200 ease-out ${
            selected ? "scale-[0.86] rounded-md" : "scale-100"
          }`}
        >
          {isVideo ? (
            <video
              // The media fragment nudges browsers into painting a first frame.
              src={`${item.url}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={item.url}
              alt={item.fileName}
              fill
              sizes={SIZES}
              priority={priority}
              className="object-cover"
            />
          )}
        </span>

        {isVideo && !selecting && (
          <span className="pointer-events-none absolute bottom-1 right-1.5 flex items-center gap-0.5 text-white drop-shadow">
            <PlayIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {selecting && (
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          aria-label={selected ? "Deselect" : "Select"}
          className="absolute bottom-1 right-1 grid h-[22px] w-[22px] place-items-center rounded-full transition active:scale-90"
          style={{
            background: selected ? "var(--accent)" : "rgba(0,0,0,0.28)",
            boxShadow: selected ? "none" : "inset 0 0 0 1.5px rgba(255,255,255,0.9)",
          }}
        >
          {selected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
        </button>
      )}
    </div>
  );
}

export default memo(PhotoTile);
