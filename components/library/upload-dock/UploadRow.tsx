import { CheckIcon, CloseIcon, RetryIcon, UploadIcon } from "@/components/ui/icons";
import type { UploadItem } from "@/components/upload/UploadProvider";
import { formatBytes } from "@/lib/format";

type Props = {
  item: UploadItem;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
};

/** One file in the expanded upload list: preview, status line, action. */
export default function UploadRow({ item, onRetry, onCancel }: Props) {
  return (
    <li className="flex items-center gap-3 border-b border-separator px-3 py-2 last:border-b-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-fill text-faint">
        {item.previewUrl ? (
          // Local object URL — never worth sending to the optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UploadIcon className="h-4 w-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px]">{item.name}</span>
        <span
          className={`block truncate text-[11px] ${
            item.status === "failed" ? "text-danger" : "text-muted"
          }`}
        >
          {statusText(item)}
        </span>
        {item.status === "uploading" && (
          <span className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-fill-strong">
            <span
              className="block h-full bg-accent transition-[width] duration-200"
              style={{ width: `${item.progress}%` }}
            />
          </span>
        )}
      </span>

      <RowAction item={item} onRetry={onRetry} onCancel={onCancel} />
    </li>
  );
}

/** Retry for failures, a tick when done, cancel while still in progress. */
function RowAction({ item, onRetry, onCancel }: Props) {
  if (item.status === "done") {
    return <CheckIcon className="h-4 w-4 shrink-0 text-accent" />;
  }

  if (item.status === "failed" || item.status === "canceled") {
    return (
      <button
        onClick={() => onRetry(item.id)}
        aria-label={`Retry ${item.name}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-accent transition hover:bg-fill"
      >
        <RetryIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => onCancel(item.id)}
      aria-label={`Cancel ${item.name}`}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-fill"
    >
      <CloseIcon className="h-4 w-4" />
    </button>
  );
}

function statusText(item: UploadItem): string {
  if (item.error) return item.error;
  if (item.status === "uploading") return `${item.progress}% of ${formatBytes(item.size)}`;
  if (item.status === "queued") return "Waiting…";
  if (item.status === "done") return "Uploaded";
  return formatBytes(item.size);
}
