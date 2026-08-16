"use client";

import { useEffect, useState, useCallback } from "react";

type FileItem = {
  id: string;
  fileName: string;
  fileType: string;
  size: number;
  url: string;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileGrid() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/files");
    if (res.ok) {
      const data = await res.json();
      setFiles(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFiles();
    window.addEventListener("file-uploaded", fetchFiles);
    return () => window.removeEventListener("file-uploaded", fetchFiles);
  }, [fetchFiles]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-16">
        No uploads yet. Select a file above to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden aspect-square"
        >
          {file.fileType.startsWith("video/") ? (
            <video
              src={file.url}
              controls
              className="w-full h-full object-cover"
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.fileName}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 translate-y-full group-hover:translate-y-0 transition-transform">
            <p className="text-xs text-white truncate">{file.fileName}</p>
            <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
