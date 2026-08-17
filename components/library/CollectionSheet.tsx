"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import Sheet from "@/components/ui/Sheet";
import {
  AlbumIcon,
  CheckIcon,
  PencilIcon,
  PhotosIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { useServerAction, type Notify } from "@/components/library/useServerAction";
import { createFolder, deleteFolder, renameFolder } from "@/lib/actions";
import { pluralize } from "@/lib/format";
import type { Collection, FolderSummary, TagSummary } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  collection: Collection;
  onSelect: (collection: Collection) => void;
  folders: FolderSummary[];
  tags: TagSummary[];
  totals: { all: number; videos: number };
  query: string;
  onQueryChange: (value: string) => void;
  notify: Notify;
};

export default function CollectionSheet({
  open,
  onClose,
  collection,
  onSelect,
  folders,
  tags,
  totals,
  query,
  onQueryChange,
  notify,
}: Props) {
  const { pending, run } = useServerAction(notify);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const submitted = useRef(false);

  function choose(next: Collection) {
    onSelect(next);
    onClose();
  }

  function saveRename(folder: FolderSummary) {
    const value = draftName.trim();
    setEditing(null);
    if (!value || value === folder.name) return;
    run(() => renameFolder(folder.id, value), `Renamed to ${value}`);
  }

  function remove(folder: FolderSummary) {
    if (
      !window.confirm(
        `Delete the album "${folder.name}"? The ${pluralize(
          folder.count,
          "item"
        )} inside stay in your library.`
      )
    ) {
      return;
    }
    setEditing(null);
    if (collection.kind === "folder" && collection.id === folder.id) {
      onSelect({ kind: "all" });
    }
    run(() => deleteFolder(folder.id), `Deleted ${folder.name}`);
  }

  /** Enter and blur can both land here — only the first one counts. */
  function create() {
    if (submitted.current) return;
    submitted.current = true;

    const value = newName.trim();
    setCreating(false);
    setNewName("");
    if (!value) return;
    run(() => createFolder(value), `Created ${value}`);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Library">
      <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="p-3">
          <label className="flex items-center gap-2 rounded-xl bg-fill px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search by name or tag"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
          </label>
        </div>

        <Row
          icon={<PhotosIcon className="h-5 w-5" />}
          label="All Photos"
          meta={pluralize(totals.all, "item")}
          active={collection.kind === "all"}
          onClick={() => choose({ kind: "all" })}
        />
        <Row
          icon={<PlayIcon className="h-5 w-5" />}
          label="Videos"
          meta={pluralize(totals.videos, "item")}
          active={collection.kind === "videos"}
          onClick={() => choose({ kind: "videos" })}
        />

        <SectionTitle>
          Albums
          <button
            onClick={() => {
              submitted.current = false;
              setCreating(true);
            }}
            className="flex items-center gap-1 text-[13px] font-medium text-accent normal-case tracking-normal"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New
          </button>
        </SectionTitle>

        {creating && (
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
                if (e.key === "Escape") setCreating(false);
              }}
              onBlur={create}
              placeholder="Album name"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
          </div>
        )}

        {folders.length === 0 && !creating && (
          <p className="px-4 pb-4 text-[13px] text-muted">
            No albums yet. Photos can belong to several albums at once.
          </p>
        )}

        <ul>
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-1 pr-2">
              {editing === folder.id ? (
                <div className="flex flex-1 items-center gap-2 px-4 py-2.5">
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(folder);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="flex-1 bg-transparent text-[15px] outline-none"
                  />
                  <button
                    onClick={() => saveRename(folder)}
                    className="text-[15px] font-semibold text-accent"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => remove(folder)}
                    aria-label={`Delete ${folder.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-danger transition hover:bg-fill"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => choose({ kind: "folder", id: folder.id })}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left transition active:bg-fill"
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
                      <span className="block truncate text-[15px]">
                        {folder.name}
                      </span>
                      <span className="block text-[12px] text-muted">
                        {pluralize(folder.count, "item")}
                      </span>
                    </span>
                    {collection.kind === "folder" && collection.id === folder.id && (
                      <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(folder.id);
                      setDraftName(folder.name);
                    }}
                    aria-label={`Rename ${folder.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-fill"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        {tags.length > 0 && (
          <>
            <SectionTitle>Tags</SectionTitle>
            <div className="flex flex-wrap gap-1.5 px-4 pb-6">
              {tags.map((tag) => {
                const active =
                  collection.kind === "tag" && collection.name === tag.name;
                return (
                  <button
                    key={tag.name}
                    onClick={() => choose({ kind: "tag", name: tag.name })}
                    className={`rounded-full px-3 py-1.5 text-[13px] transition active:scale-95 ${
                      active
                        ? "bg-accent text-white"
                        : "bg-fill text-muted hover:bg-fill-strong"
                    }`}
                  >
                    {tag.name}
                    <span className={active ? "ml-1.5 text-white/70" : "ml-1.5 text-faint"}>
                      {tag.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center justify-between px-4 pb-1 pt-4 text-[12px] font-medium uppercase tracking-wide text-muted">
      {children}
    </h3>
  );
}

function Row({
  icon,
  label,
  meta,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-fill"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-fill text-accent">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[15px]">{label}</span>
        <span className="block text-[12px] text-muted">{meta}</span>
      </span>
      {active && <CheckIcon className="h-4 w-4 text-accent" />}
    </button>
  );
}
