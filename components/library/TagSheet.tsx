"use client";

import { useEffect, useMemo, useState } from "react";

import Sheet from "@/components/ui/Sheet";
import TagInput from "@/components/ui/TagInput";
import { CloseIcon } from "@/components/ui/icons";
import { useServerAction, type Notify } from "@/components/library/useServerAction";
import { addTags, removeTag } from "@/lib/actions";
import { pluralize } from "@/lib/format";
import type { MediaItem, TagSummary } from "@/lib/types";

type Props = {
  open: boolean;
  targets: MediaItem[];
  allTags: TagSummary[];
  onClose: () => void;
  notify: Notify;
};

export default function TagSheet({
  open,
  targets,
  allTags,
  onClose,
  notify,
}: Props) {
  const { pending, run } = useServerAction(notify);
  const [draft, setDraft] = useState<string[]>([]);

  // Start clean every time the sheet is opened for a new selection.
  useEffect(() => {
    if (open) setDraft([]);
  }, [open, targets.length]);

  const ids = targets.map((t) => t.id);

  /** Tags already on the selection, with how many items carry each one. */
  const current = useMemo(() => {
    const counts = new Map<string, number>();
    for (const target of targets) {
      for (const tag of target.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [targets]);

  function apply() {
    const pendingTags = draft.filter((tag) => !current.some((c) => c.name === tag));
    if (pendingTags.length === 0) {
      onClose();
      return;
    }
    run(() => addTags(ids, pendingTags), `Tagged ${pluralize(ids.length, "item")}`);
    setDraft([]);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ids.length > 1 ? `Tag ${pluralize(ids.length, "item")}` : "Tags"}
      action={
        <button
          onClick={apply}
          className="text-[15px] font-semibold text-accent transition active:opacity-60"
        >
          Done
        </button>
      }
    >
      <div
        className={`flex flex-col gap-5 p-4 ${pending ? "opacity-60" : ""} transition-opacity`}
      >
        <TagInput
          value={draft}
          onChange={setDraft}
          suggestions={allTags.map((t) => t.name)}
          placeholder="Add a tag"
          autoFocus
        />

        {current.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">
              On this selection
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {current.map((tag) => (
                <span
                  key={tag.name}
                  className="flex items-center gap-1 rounded-full bg-fill py-1 pl-3 pr-1 text-[13px]"
                >
                  {tag.name}
                  {ids.length > 1 && (
                    <span className="text-muted">
                      {tag.count}/{ids.length}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      run(
                        () => removeTag(ids, tag.name),
                        `Removed "${tag.name}"`
                      )
                    }
                    aria-label={`Remove ${tag.name}`}
                    className="grid h-5 w-5 place-items-center rounded-full text-muted transition hover:bg-fill-strong"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}

        {allTags.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">
              All tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const already =
                  draft.includes(tag.name) ||
                  current.some((c) => c.name === tag.name && c.count === ids.length);
                return (
                  <button
                    key={tag.name}
                    disabled={already}
                    onClick={() => setDraft((prev) => [...prev, tag.name])}
                    className="rounded-full bg-fill px-3 py-1.5 text-[13px] text-muted transition hover:bg-fill-strong disabled:opacity-40 active:scale-95"
                  >
                    {tag.name}
                    <span className="ml-1.5 text-faint">{tag.count}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}
