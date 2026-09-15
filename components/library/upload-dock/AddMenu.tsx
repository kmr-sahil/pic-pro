"use client";

import { useEffect, useRef, useState } from "react";

import { AlbumIcon, PlusIcon, UploadIcon } from "@/components/ui/icons";

type Props = {
  onPickFiles: () => void;
  onNewAlbum: () => void;
};

/** The floating "+" button and its small menu, shown when nothing is uploading. */
export default function AddMenu({ onPickFiles, onNewAlbum }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside tap or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative flex flex-col items-end gap-2">
      {open && (
        <div className="glass w-60 overflow-hidden rounded-2xl text-[15px]">
          <button
            onClick={() => choose(onPickFiles)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-fill"
          >
            <UploadIcon className="h-4.5 w-4.5 text-muted" />
            Upload photos or videos
          </button>
          <button
            onClick={() => choose(onNewAlbum)}
            className="flex w-full items-center gap-3 border-t border-separator px-4 py-3 text-left transition hover:bg-fill"
          >
            <AlbumIcon className="h-4.5 w-4.5 text-muted" />
            New album
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Add photos"
        aria-expanded={open}
        className="grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-float transition active:scale-95"
      >
        <PlusIcon
          className={`h-6 w-6 transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        />
      </button>
    </div>
  );
}
