/** An upload failure. `transient` ones are retried automatically. */
export class UploadError extends Error {
  transient: boolean;

  constructor(message: string, transient = false) {
    super(message);
    this.transient = transient;
  }
}

/** Pulls `{ error }` out of an API response, or falls back to a generic message. */
export async function readError(res: Response, fallback: string): Promise<string> {
  if (res.status === 401) return "Signed out. Sign in again to continue.";
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Not JSON — fall through to the generic message.
  }
  return `${fallback} (${res.status})`;
}
