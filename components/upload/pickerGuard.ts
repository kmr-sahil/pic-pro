/**
 * Detects the "picked photos, came back, nothing happened" case on phones.
 *
 * While the gallery app is in front, a mobile browser may discard the tab to
 * free memory. Coming back reloads the page and the selection is gone. We
 * leave a marker in sessionStorage (it survives that reload) when the picker
 * opens and clear it when the page gets control back; if the marker is still
 * there on load, the page was reloaded mid-pick.
 */

const KEY = "picpro:picker-opened-at";
const MAX_AGE_MS = 10 * 60 * 1000;

export function markPickerOpen() {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage blocked — detection just won't work.
  }
}

export function markPickerClosed() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

/** True (once) if the page was reloaded while the picker was open. */
export function consumeInterruptedPick(): boolean {
  try {
    const openedAt = Number(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    return openedAt > 0 && Date.now() - openedAt < MAX_AGE_MS;
  } catch {
    return false;
  }
}
