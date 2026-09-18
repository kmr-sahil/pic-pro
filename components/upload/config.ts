/** Tuning knobs for the upload queue. */

/** Files uploading at the same time. Serial uploads read as "stuck" on a
 *  phone; three keeps a mobile link busy without starving each transfer. */
export const CONCURRENCY = 2;

/** Total tries per file, counting the first one. */
export const MAX_ATTEMPTS = 3;

/** First retry waits this long; each later retry doubles it. */
export const RETRY_BASE_DELAY_MS = 800;

export const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/** Give up on an API call (presign / save) that hasn't answered by then. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Abort and retry a storage PUT that has sent no bytes for this long. */
export const STALL_TIMEOUT_MS = 45_000;

/** Coalesce library refreshes while a batch is still landing. */
export const REFRESH_DEBOUNCE_MS = 1200;

/** How long a fully successful batch stays on screen. */
export const CLEAR_AFTER_MS = 2500;
