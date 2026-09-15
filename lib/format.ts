export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Server and browser can disagree on locale and timezone, which breaks
 * hydration. Pass `local: false` for SSR and the first client render (fixed
 * en-US + UTC, identical everywhere), then `true` once hydrated.
 */
function formatters(local: boolean) {
  const locale = local ? undefined : "en-US";
  const timeZone = local ? undefined : "UTC";
  return {
    month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone }),
    day: new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone,
    }),
    time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }),
  };
}

let localFormatters: ReturnType<typeof formatters> | null = null;
const stableFormatters = formatters(false);

function pick(local: boolean) {
  if (!local) return stableFormatters;
  return (localFormatters ??= formatters(true));
}

/** "August 2026" — the sticky heading above each run of photos. */
export function formatMonth(iso: string, local = true): string {
  return pick(local).month.format(new Date(iso));
}

export function formatDateTime(iso: string, local = true): string {
  const date = new Date(iso);
  const f = pick(local);
  return `${f.day.format(date)} · ${f.time.format(date)}`;
}

export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
