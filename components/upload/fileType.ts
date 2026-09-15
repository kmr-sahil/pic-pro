import { MAX_BYTES } from "./config";

/**
 * Some mobile pickers (Android cloud galleries, HEIC on older browsers) hand
 * over files with an empty `type`. Fall back to the extension so those still
 * upload instead of being rejected as "not a photo or video".
 */
const TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  "3gp": "video/3gpp",
  mkv: "video/x-matroska",
};

export function resolveType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPES_BY_EXTENSION[extension] ?? "";
}

/** Returns why a file can't be uploaded, or null if it's fine. */
export function validate(file: File | undefined): string | null {
  if (!file) return "File is no longer available.";
  if (!/^(image|video)\//.test(resolveType(file))) return "Not a photo or video.";
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_BYTES) return "Larger than 2 GB.";
  return null;
}
