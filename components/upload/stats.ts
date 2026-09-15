import type { UploadItem, UploadStats } from "./types";

export const isFinished = (item: UploadItem) =>
  item.status === "done" || item.status === "failed" || item.status === "canceled";

/** Counts per status plus overall progress, weighted by file size. */
export function computeStats(items: UploadItem[]): UploadStats {
  let done = 0;
  let failed = 0;
  let canceled = 0;
  let pending = 0;
  let totalWeight = 0;
  let sentWeight = 0;

  for (const item of items) {
    const weight = Math.max(item.size, 1);
    totalWeight += weight;

    switch (item.status) {
      case "done":
        done++;
        sentWeight += weight;
        break;
      case "failed":
        failed++;
        break;
      case "canceled":
        canceled++;
        break;
      default:
        pending++;
        if (item.status === "uploading") sentWeight += (weight * item.progress) / 100;
    }
  }

  return {
    total: items.length,
    done,
    failed,
    canceled,
    pending,
    progress: totalWeight === 0 ? 0 : Math.round((sentWeight / totalWeight) * 100),
    active: pending > 0,
  };
}
