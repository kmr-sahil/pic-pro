"use client";

import { useEffect } from "react";
import { CloseIcon } from "@/components/ui/icons";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rendered on the right of the header, e.g. a Done button. */
  action?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * A bottom sheet on phones, a centred card on wider screens.
 */
export default function Sheet({
  open,
  onClose,
  title,
  action,
  children,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px] animate-[fade_.18s_ease-out]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-surface-solid shadow-float animate-[sheet-in_.24s_cubic-bezier(.32,.72,0,1)]"
      >
        <header className="flex items-center gap-3 px-4 py-3.5 border-b border-separator">
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-fill text-muted transition hover:bg-fill-strong active:scale-95"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          <h2 className="flex-1 text-center text-[15px] font-semibold">{title}</h2>
          <div className="min-w-8 text-right">{action}</div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain safe-b">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes sheet-in {
          from { transform: translateY(14px); opacity: 0 }
          to { transform: none; opacity: 1 }
        }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}
