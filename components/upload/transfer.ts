/**
 * The network side of one upload, with no React in it:
 *   1. ask our API for a presigned S3 PUT url
 *   2. send the bytes straight to S3
 *   3. record the file in the library
 * Every step honours the abort signal (cancel) and has a timeout, so a dead
 * mobile connection fails and retries instead of hanging forever.
 */

import { REQUEST_TIMEOUT_MS, STALL_TIMEOUT_MS } from "./config";
import { readError, UploadError } from "./errors";

export type TransferJob = {
  file: File;
  type: string;
  folderIds: string[];
  tags: string[];
};

export type TransferOptions = {
  signal: AbortSignal;
  onProgress: (percent: number) => void;
  /** Key from an earlier attempt whose bytes already reached S3. */
  storedKey?: string;
  /** Called once the bytes are in S3, so a retry can skip straight to saving. */
  onStored: (key: string) => void;
};

export async function uploadFile(job: TransferJob, options: TransferOptions) {
  const { signal, onProgress, onStored } = options;

  let key = options.storedKey;
  if (!key) {
    const { uploadUrl, fileKey } = await requestUploadUrl(job, signal);
    await putToStorage(uploadUrl, job, signal, onProgress);
    onStored(fileKey);
    key = fileKey;
  }

  await saveToLibrary(job, key, signal);
}

// ─── Step 1: presign ────────────────────────────────────────────────────────

async function requestUploadUrl(
  job: TransferJob,
  signal: AbortSignal
): Promise<{ uploadUrl: string; fileKey: string }> {
  const res = await postJson(
    "/api/upload-url",
    { fileName: job.file.name, fileType: job.type, size: job.file.size },
    signal,
    "Couldn't prepare the upload."
  );
  return res.json();
}

// ─── Step 2: PUT to S3 ──────────────────────────────────────────────────────

/** XHR rather than fetch, because fetch can't report upload progress. */
function putToStorage(
  url: string,
  job: TransferJob,
  signal: AbortSignal,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new UploadError("Canceled."));

    const xhr = new XMLHttpRequest();
    let lastActivity = Date.now();
    let stalled = false;

    // Mobile networks can go silent without ever erroring; treat that as a
    // retryable failure rather than leaving the file stuck at some percent.
    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > STALL_TIMEOUT_MS) {
        stalled = true;
        xhr.abort();
      }
    }, 5000);

    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort);

    const finish = (error?: UploadError) => {
      clearInterval(watchdog);
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };

    xhr.upload.onprogress = (e) => {
      lastActivity = Date.now();
      if (e.lengthComputable) {
        // Hold 100 back until S3 confirms and the library row exists.
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return finish();
      if (xhr.status === 403) return finish(new UploadError("Upload link expired.", true));
      finish(
        new UploadError(`Storage rejected the file (${xhr.status}).`, xhr.status >= 500)
      );
    };
    xhr.onerror = () => finish(new UploadError("Connection lost.", true));
    xhr.onabort = () =>
      finish(stalled ? new UploadError("Upload stalled.", true) : new UploadError("Canceled."));

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", job.type);
    xhr.send(job.file);
  });
}

// ─── Step 3: save the library row ───────────────────────────────────────────

async function saveToLibrary(job: TransferJob, storageKey: string, signal: AbortSignal) {
  await postJson(
    "/api/save-file",
    {
      fileName: job.file.name,
      fileType: job.type,
      size: job.file.size,
      storageKey,
      folderIds: job.folderIds,
      tags: job.tags,
    },
    signal,
    "Couldn't save to your library."
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** POST JSON with cancel + timeout; throws UploadError on any failure. */
async function postJson(
  url: string,
  body: unknown,
  signal: AbortSignal,
  failMessage: string
): Promise<Response> {
  if (signal.aborted) throw new UploadError("Canceled.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    if (signal.aborted) throw new UploadError("Canceled.");
    throw new UploadError(
      controller.signal.aborted ? "Server took too long." : "No connection.",
      true
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }

  if (!res.ok) {
    const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
    throw new UploadError(await readError(res, failMessage), retryable);
  }
  return res;
}
