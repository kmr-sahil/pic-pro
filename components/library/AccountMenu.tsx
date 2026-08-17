"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { SelectIcon, SignOutIcon } from "@/components/ui/icons";
import { signOutAction } from "@/lib/actions";
import { formatBytes, pluralize } from "@/lib/format";

type Props = {
  user: { name: string | null; email: string; image: string | null };
  itemCount: number;
  bytesUsed: number;
  onStartSelecting: () => void;
};

export default function AccountMenu({
  user,
  itemCount,
  bytesUsed,
  onStartSelecting,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const initial = (user.name ?? user.email).trim().charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account and settings"
        aria-expanded={open}
        className="glass grid h-10 w-10 place-items-center overflow-hidden rounded-full transition active:scale-95"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[15px] font-semibold">{initial}</span>
        )}
      </button>

      {open && (
        <div className="glass absolute right-0 top-12 w-64 origin-top-right overflow-hidden rounded-2xl text-[15px] animate-[menu-in_.16s_ease-out]">
          <div className="border-b border-separator px-4 py-3">
            <p className="truncate font-semibold">{user.name ?? "Signed in"}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
            <p className="mt-1 text-[12px] text-faint">
              {pluralize(itemCount, "item")} · {formatBytes(bytesUsed)}
            </p>
          </div>

          <MenuItem
            icon={<SelectIcon className="h-4.5 w-4.5" />}
            label="Select items"
            onClick={() => {
              setOpen(false);
              onStartSelecting();
            }}
          />

          <form action={signOutAction}>
            <MenuItem
              icon={<SignOutIcon className="h-4.5 w-4.5" />}
              label="Sign out"
              type="submit"
            />
          </form>

          <style>{`
            @keyframes menu-in {
              from { opacity: 0; transform: scale(.96) translateY(-4px) }
              to { opacity: 1; transform: none }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  type = "button",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-fill active:bg-fill-strong"
    >
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  );
}
