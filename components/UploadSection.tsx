"use client";

import { useRef, useState } from "react";

export default function UploadSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setProgress(0);
    setFileName(file.name);

    try {
      // 1. Get presigned URL
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileKey } = await res.json();

      // 2. Upload directly to S3
      await uploadWithProgress(uploadUrl, file, setProgress);

      // 3. Save metadata
      const saveRes = await fetch("/api/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          size: file.size,
          storageKey: fileKey,
        }),
      });

      if (!saveRes.ok) throw new Error("Failed to save file metadata");

      setStatus("done");
      if (inputRef.current) inputRef.current.value = "";
      window.dispatchEvent(new Event("file-uploaded"));
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Upload</h2>

      <div className="flex gap-3 items-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="flex-1 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700 file:cursor-pointer cursor-pointer"
          onChange={() => setStatus("idle")}
        />
        <button
          onClick={handleUpload}
          disabled={status === "uploading"}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
        >
          {status === "uploading" ? "Uploading…" : "Upload"}
        </button>
      </div>

      {status === "uploading" && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{fileName} — {progress}%</span>
        </div>
      )}

      {status === "done" && (
        <p className="text-sm text-green-400">Uploaded successfully.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-400">Upload failed. Please try again.</p>
      )}
    </section>
  );
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
    xhr.onerror = reject;
    xhr.send(file);
  });
}
