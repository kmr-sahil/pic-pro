"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AccountMenu from "@/components/library/AccountMenu";
import AlbumSheet from "@/components/library/AlbumSheet";
import CollectionSheet from "@/components/library/CollectionSheet";
import FileRow from "@/components/library/FileRow";
import PhotoTile from "@/components/library/PhotoTile";
import SelectionBar from "@/components/library/SelectionBar";
import TagSheet from "@/components/library/TagSheet";
import UploadDock from "@/components/library/UploadDock";
import Viewer from "@/components/library/Viewer";
import { useHydrated } from "@/components/library/useHydrated";
import { useServerAction } from "@/components/library/useServerAction";
import { useUploadMode } from "@/components/library/useUploadMode";
import { ChevronDownIcon, PhotosIcon, UploadIcon } from "@/components/ui/icons";
import { useUploads } from "@/components/upload/UploadProvider";
import {
  consumeInterruptedPick,
  markPickerClosed,
  markPickerOpen,
} from "@/components/upload/pickerGuard";
import { deleteFiles } from "@/lib/actions";
import { formatMonth, pluralize } from "@/lib/format";
import type { Collection, LibraryData, MediaItem } from "@/lib/types";

type SheetName = "collections" | "albums" | "tags" | null;

type Props = {
  data: LibraryData;
  user: { name: string | null; email: string; image: string | null };
};

export default function Library({ data, user }: Props) {
  const { enqueue } = useUploads();
  const [uploadMode, setUploadMode] = useUploadMode();

  // Album covers are S3 images too — upload mode shows the album icon instead.
  const folders = useMemo(
    () =>
      uploadMode ? data.folders.map((f) => ({ ...f, cover: null })) : data.folders,
    [uploadMode, data.folders]
  );

  const [collection, setCollection] = useState<Collection>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  /** When set, sheets act on this single item instead of the selection. */
  const [sheetTargetId, setSheetTargetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const notify = useCallback((text: string, tone: "info" | "error" = "info") => {
    setNotice({ text, tone });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const openPicker = useCallback(() => {
    markPickerOpen();
    fileInputRef.current?.click();
  }, []);

  // Phones may discard the tab while the gallery is open, losing the
  // selection. Tell the user instead of silently showing nothing.
  useEffect(() => {
    if (consumeInterruptedPick()) {
      notify("Page reloaded while picking — choose files again", "error");
    }

    // Getting focus back means the page survived the picker.
    const input = fileInputRef.current;
    window.addEventListener("focus", markPickerClosed);
    input?.addEventListener("cancel", markPickerClosed);
    return () => {
      window.removeEventListener("focus", markPickerClosed);
      input?.removeEventListener("cancel", markPickerClosed);
    };
  }, [notify]);

  // An album can disappear from under the current filter (deleted elsewhere).
  useEffect(() => {
    if (
      collection.kind === "folder" &&
      !data.folders.some((f) => f.id === collection.id)
    ) {
      setCollection({ kind: "all" });
    }
    if (
      collection.kind === "tag" &&
      !data.tags.some((t) => t.name === collection.name)
    ) {
      setCollection({ kind: "all" });
    }
  }, [collection, data.folders, data.tags]);

  const visible = useMemo(() => {
    let list = data.items;
    if (collection.kind === "folder") {
      list = list.filter((item) => item.folderIds.includes(collection.id));
    } else if (collection.kind === "tag") {
      list = list.filter((item) => item.tags.includes(collection.name));
    } else if (collection.kind === "videos") {
      list = list.filter((item) => item.fileType.startsWith("video/"));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.fileName.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.includes(q))
      );
    }
    return list;
  }, [data.items, collection, query]);

  // Photos runs one heading per month, newest first.
  const hydrated = useHydrated();
  const months = useMemo(() => {
    const groups: { key: string; items: MediaItem[] }[] = [];
    for (const item of visible) {
      const key = formatMonth(item.createdAt, hydrated);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.items.push(item);
      else groups.push({ key, items: [item] });
    }
    return groups;
  }, [visible, hydrated]);

  const title =
    collection.kind === "all"
      ? "All Photos"
      : collection.kind === "videos"
        ? "Videos"
        : collection.kind === "tag"
          ? `#${collection.name}`
          : (data.folders.find((f) => f.id === collection.id)?.name ?? "Album");

  const byId = useMemo(
    () => new Map(data.items.map((item) => [item.id, item])),
    [data.items]
  );

  const targets = useMemo(() => {
    if (sheetTargetId) {
      const one = byId.get(sheetTargetId);
      return one ? [one] : [];
    }
    return [...selected].map((id) => byId.get(id)).filter(Boolean) as MediaItem[];
  }, [sheetTargetId, selected, byId]);

  const { pending: deleting, run } = useServerAction(notify);

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startSelectionWith = useCallback((id: string) => {
    setSelecting(true);
    setSelected(new Set([id]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selecting && !sheet && !viewerId) exitSelection();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selecting, sheet, viewerId, exitSelection]);

  /** Uploads land in the album you're looking at, the way Photos does it. */
  const uploadContext = useMemo(
    () => ({
      folderIds: collection.kind === "folder" ? [collection.id] : [],
      tags: collection.kind === "tag" ? [collection.name] : [],
    }),
    [collection]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const count = enqueue(files, uploadContext);
      if (count > 0) {
        notify(`Added ${pluralize(count, "file")} to the upload queue`);
      }
    },
    [enqueue, uploadContext, notify]
  );

  function removeSelected(ids: string[]) {
    if (ids.length === 0) return;
    const label = pluralize(ids.length, "item");
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;

    setViewerId(null);
    exitSelection();
    run(() => deleteFiles(ids), `Deleted ${label}`);
  }

  const viewerIndex = viewerId ? visible.findIndex((i) => i.id === viewerId) : -1;

  return (
    <div
      className="min-h-dvh"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          markPickerClosed();
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <main className="px-0.5 pb-32 pt-16 sm:px-1">
        {visible.length === 0 ? (
          <EmptyState
            filtered={collection.kind !== "all" || query.trim().length > 0}
            onPick={openPicker}
          />
        ) : (
          months.map((group, groupIndex) => (
            <section key={group.key}>
              <h2 className="sticky top-0 z-10 bg-canvas/80 px-2.5 py-2 text-[13px] font-semibold backdrop-blur">
                {group.key}
              </h2>
              {uploadMode ? (
                <div className="mx-auto max-w-5xl">
                  {group.items.map((item) => (
                    <FileRow
                      key={item.id}
                      item={item}
                      selecting={selecting}
                      selected={selected.has(item.id)}
                      onOpen={setViewerId}
                      onToggle={toggleSelected}
                      onLongPress={startSelectionWith}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-5 sm:gap-1 lg:grid-cols-7 xl:grid-cols-8">
                  {group.items.map((item, index) => (
                    <PhotoTile
                      key={item.id}
                      item={item}
                      selecting={selecting}
                      selected={selected.has(item.id)}
                      priority={groupIndex === 0 && index < 12}
                      onOpen={setViewerId}
                      onToggle={toggleSelected}
                      onLongPress={startSelectionWith}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </main>

      {/* Top-left: what the grid is showing. */}
      <div className="fixed left-3 top-3 z-20 flex items-center gap-2 pt-[env(safe-area-inset-top)]">
        {selecting ? (
          <span className="glass rounded-full px-4 py-2.5 text-[14px] font-semibold">
            {selected.size === 0
              ? "Select items"
              : `${pluralize(selected.size, "item")} selected`}
          </span>
        ) : (
          <button
            onClick={() => setSheet("collections")}
            className="glass flex items-center gap-1.5 rounded-full py-2.5 pl-4 pr-3 text-[14px] font-semibold transition active:scale-95"
          >
            <span className="max-w-[45vw] truncate">{title}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
          </button>
        )}
        {query.trim() && !selecting && (
          <button
            onClick={() => setQuery("")}
            className="glass rounded-full px-3 py-2.5 text-[13px] text-muted"
          >
            “{query.trim()}” ✕
          </button>
        )}
      </div>

      {/* Top-right: account, settings, and selection mode. */}
      <div className="fixed right-3 top-3 z-20 pt-[env(safe-area-inset-top)]">
        {selecting ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setSelected(
                  selected.size === visible.length
                    ? new Set()
                    : new Set(visible.map((i) => i.id))
                )
              }
              className="glass rounded-full px-4 py-2.5 text-[14px] transition active:scale-95"
            >
              {selected.size === visible.length && visible.length > 0
                ? "None"
                : "All"}
            </button>
            <button
              onClick={exitSelection}
              className="glass rounded-full px-4 py-2.5 text-[14px] font-semibold text-accent transition active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          <AccountMenu
            user={user}
            itemCount={data.items.length}
            bytesUsed={data.items.reduce((sum, item) => sum + item.size, 0)}
            onStartSelecting={() => setSelecting(true)}
            uploadMode={uploadMode}
            onUploadModeChange={setUploadMode}
          />
        )}
      </div>

      {/* Bottom-right: upload control, or the selection action bar. */}
      <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-2 pb-[env(safe-area-inset-bottom)]">
        <UploadDock
          onPickFiles={openPicker}
          onNewAlbum={() => {
            setSheetTargetId(null);
            setSheet("albums");
          }}
        />
        {selecting && (
          <SelectionBar
            count={selected.size}
            onAlbums={() => {
              setSheetTargetId(null);
              setSheet("albums");
            }}
            onTags={() => {
              setSheetTargetId(null);
              setSheet("tags");
            }}
            onDelete={() => removeSelected([...selected])}
          />
        )}
      </div>

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
          <p
            className={`glass max-w-full truncate rounded-full px-4 py-2 text-[13px] ${
              notice.tone === "error" ? "text-danger" : ""
            }`}
          >
            {notice.text}
          </p>
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-canvas/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-accent px-10 py-8 text-accent">
            <UploadIcon className="h-8 w-8" />
            <p className="text-[15px] font-medium">Drop to upload</p>
          </div>
        </div>
      )}

      {viewerIndex >= 0 && (
        <Viewer
          items={visible}
          index={viewerIndex}
          onIndexChange={(next) => setViewerId(visible[next]?.id ?? null)}
          onClose={() => setViewerId(null)}
          onAlbums={(id) => {
            setSheetTargetId(id);
            setSheet("albums");
          }}
          onTags={(id) => {
            setSheetTargetId(id);
            setSheet("tags");
          }}
          onDelete={(id) => removeSelected([id])}
        />
      )}

      <CollectionSheet
        open={sheet === "collections"}
        onClose={() => setSheet(null)}
        collection={collection}
        onSelect={setCollection}
        folders={folders}
        tags={data.tags}
        totals={{
          all: data.items.length,
          videos: data.items.filter((i) => i.fileType.startsWith("video/")).length,
        }}
        query={query}
        onQueryChange={setQuery}
        notify={notify}
      />

      <AlbumSheet
        open={sheet === "albums"}
        targets={targets}
        folders={folders}
        onClose={() => {
          setSheet(null);
          setSheetTargetId(null);
        }}
        notify={notify}
      />

      <TagSheet
        open={sheet === "tags"}
        targets={targets}
        allTags={data.tags}
        onClose={() => {
          setSheet(null);
          setSheetTargetId(null);
        }}
        notify={notify}
      />

      {deleting && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-canvas/30" />
      )}
    </div>
  );
}

function EmptyState({
  filtered,
  onPick,
}: {
  filtered: boolean;
  onPick: () => void;
}) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-8 text-center">
      <PhotosIcon className="h-12 w-12 text-faint" strokeWidth={1.2} />
      <div>
        <p className="text-[17px] font-semibold">
          {filtered ? "Nothing here yet" : "Your library is empty"}
        </p>
        <p className="mt-1 text-[14px] text-muted">
          {filtered
            ? "Try another album, tag, or search."
            : "Drag photos and videos anywhere, or use the + button."}
        </p>
      </div>
      {!filtered && (
        <button
          onClick={onPick}
          className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-white transition active:scale-95"
        >
          Choose files
        </button>
      )}
    </div>
  );
}
