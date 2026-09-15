"use client";

import AddMenu from "@/components/library/upload-dock/AddMenu";
import UploadPanel from "@/components/library/upload-dock/UploadPanel";
import { useUploads } from "@/components/upload/UploadProvider";

type Props = {
  onPickFiles: () => void;
  onNewAlbum: () => void;
};

/**
 * Bottom-right control. A plain "+" when idle; it becomes the upload status
 * panel as soon as there is a queue, and stays until failures are dealt with.
 */
export default function UploadDock({ onPickFiles, onNewAlbum }: Props) {
  const { items } = useUploads();

  return items.length > 0 ? (
    <UploadPanel onPickFiles={onPickFiles} />
  ) : (
    <AddMenu onPickFiles={onPickFiles} onNewAlbum={onNewAlbum} />
  );
}
