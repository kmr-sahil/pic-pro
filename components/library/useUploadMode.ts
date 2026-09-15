"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "picpro:upload-mode";
const CHANGE_EVENT = "picpro:upload-mode-change";

/**
 * Upload mode lists files by name instead of rendering previews, so browsing
 * the library never pulls images or videos from S3. On by default.
 */
function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useUploadMode() {
  const enabled = useSyncExternalStore(subscribe, read, () => true);

  const setEnabled = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Storage blocked — the change still applies for this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [enabled, setEnabled] as const;
}
