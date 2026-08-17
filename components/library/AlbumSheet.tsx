"use client";

import Image from "next/image";
import { useState } from "react";

import Sheet from "@/components/ui/Sheet";
import { AlbumIcon, CheckIcon, PlusIcon } from "@/components/ui/icons";
import { useServerAction, type Notify } from "@/components/library/useServerAction";
import { addToFolder, createFolder, removeFromFolder } from "@/lib/actions";
import { pluralize } from "@/lib/format";
import type { FolderSummary, MediaItem } from "@/lib/types";

type Props = {
  open: boolean;
  targets: MediaItem[];
  folders: FolderSummary[];
  onClose: () => void;
  notify: Notify;
};

/** Tick = in every selected item, dash = in some of them. */
type Membership = "all" | "some" | "none";

export default function AlbumSheet({
  open,
  targets,
  folders,
  onClose,
  notify,
}: Props) {
  const { pending, run } = useServerAction(notify);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const ids = targets.map((t) => t.id);

  function membership(folderId: string): Membership {
    const inFolder = targets.filter((t) => t.folderIds.includes(folderId)).length;
    if (inFolder === 0) return "none";
    return inFolder === targets.length ? "all" : "some";
  }

  function toggle(folder: FolderSummary) {
    if (membership(folder.id) === "all") {
      run(() => removeFromFolder(ids, folder.id), `Removed from ${folder.name}`);
    } else {
      run(() => addToFolder(ids, folder.id), `Added to ${folder.name}`);
    }
  }

  function create() {
    const value = name.trim();
    if (!value) return;
    // Creating an album from a selection drops the selection straight into it.
    run<unknown>(async () => {
      const created = await createFolder(value);
      if (!created.ok || ids.length === 0) return created;
      return addToFolder(ids, created.data.id);
    }, `Created ${value}`);
    setName("");
    setCreating(false);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ids.length > 1 ? `Add ${pluralize(ids.length, "item")}` : "Albums"}
      action={
        <button
          onClick={onClose}
          className="text-[15px] font-semibold text-accent transition active:opacity-60"
        >
          Done
        </button>
      }
    >
      <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {creating ? (
          <div className="flex items-center gap-2 border-b border-separator px-4 py-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Album name"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            <button
              onClick={create}
              disabled={!name.trim()}
              className="text-[15px] font-semibold text-accent disabled:text-faint"
            >
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-3 border-b border-separator px-4 py-3 text-left transition active:bg-fill"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-fill text-accent">
              <PlusIcon className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-medium text-accent">New Album</span>
          </button>
        )}

        {folders.length === 0 && !creating && (
          <p className="px-4 py-10 text-center text-[13px] text-muted">
            No albums yet. Create one to group photos and videos — an item can sit
            in as many albums as you like.
          </p>
        )}

        <ul>
          {folders.map((folder) => {
            const state = membership(folder.id);
            return (
              <li key={folder.id}>
                <button
                  onClick={() => toggle(folder)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-fill"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-fill text-faint">
                    {folder.cover ? (
                      <Image
                        src={folder.cover}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AlbumIcon className="h-5 w-5" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{folder.name}</span>
                    <span className="block text-[12px] text-muted">
                      {pluralize(folder.count, "item")}
                    </span>
                  </span>

                  <span
                    className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border transition ${
                      state === "none"
                        ? "border-separator"
                        : "border-transparent bg-accent text-white"
                    }`}
                  >
                    {state === "all" && <CheckIcon className="h-3.5 w-3.5" />}
                    {state === "some" && (
                      <span className="h-0.5 w-2.5 rounded-full bg-white" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
