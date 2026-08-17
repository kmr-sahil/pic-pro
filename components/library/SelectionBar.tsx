"use client";

import { AlbumIcon, TagIcon, TrashIcon } from "@/components/ui/icons";

type Props = {
  count: number;
  onAlbums: () => void;
  onTags: () => void;
  onDelete: () => void;
};

export default function SelectionBar({
  count,
  onAlbums,
  onTags,
  onDelete,
}: Props) {
  const disabled = count === 0;

  return (
    <div className="glass flex w-[min(92vw,25rem)] items-center gap-1 rounded-3xl p-1.5">
      <Action
        icon={<AlbumIcon className="h-5 w-5" />}
        label="Album"
        disabled={disabled}
        onClick={onAlbums}
      />
      <Action
        icon={<TagIcon className="h-5 w-5" />}
        label="Tag"
        disabled={disabled}
        onClick={onTags}
      />
      <Action
        icon={<TrashIcon className="h-5 w-5" />}
        label="Delete"
        disabled={disabled}
        danger
        onClick={onDelete}
      />
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] transition active:scale-95 disabled:opacity-35 ${
        danger ? "text-danger hover:bg-danger/10" : "text-accent hover:bg-accent/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
