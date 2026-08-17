"use client";

import { useMemo, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";

const clean = (raw: string) =>
  raw.replace(/[,\n\r\t]/g, " ").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 40);

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  autoFocus?: boolean;
};

export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag",
  autoFocus,
}: Props) {
  const [draft, setDraft] = useState("");

  const matches = useMemo(() => {
    const q = clean(draft);
    return suggestions
      .filter((tag) => !value.includes(tag))
      .filter((tag) => (q ? tag.includes(q) : true))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  function add(raw: string) {
    const tag = clean(raw);
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-fill px-2.5 py-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-accent/12 py-1 pl-2.5 pr-1 text-[13px] font-medium text-accent"
          >
            {tag}
            <button
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              className="grid h-4.5 w-4.5 place-items-center rounded-full transition hover:bg-accent/20"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => {
            // Typing a comma is a natural "next tag" gesture.
            if (e.target.value.includes(",")) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-24 flex-1 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-faint"
        />
      </div>

      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((tag) => (
            <button
              key={tag}
              onClick={() => add(tag)}
              className="rounded-full bg-fill px-3 py-1.5 text-[13px] text-muted transition hover:bg-fill-strong active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
