/**
 * All timestamps are stored and compared in UTC (ISO 8601 strings).
 * Display is in the user's timezone, defaulting to Asia/Kolkata (F-SLA-09).
 *
 * Deliberately built on Intl rather than date-fns-tz: the whole timezone
 * requirement is display formatting, and Intl does it with zero dependencies.
 */

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export type Iso = string;

function fmt(opts: Intl.DateTimeFormatOptions, tz: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: tz, ...opts });
}

/** "12 Mar 2026" */
export function formatDate(iso: Iso, tz: string = DEFAULT_TIMEZONE): string {
  return fmt({ day: "2-digit", month: "short", year: "numeric" }, tz).format(
    new Date(iso),
  );
}

/** "12 Mar, 4:30 pm" — the default for deadlines. */
export function formatDateTime(iso: Iso, tz: string = DEFAULT_TIMEZONE): string {
  return fmt(
    {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    tz,
  ).format(new Date(iso));
}

/** "4:30 pm" */
export function formatTime(iso: Iso, tz: string = DEFAULT_TIMEZONE): string {
  return fmt({ hour: "numeric", minute: "2-digit", hour12: true }, tz).format(
    new Date(iso),
  );
}

/** "12 March 2026 at 4:30 pm IST" — for audit and consent records. */
export function formatFull(iso: Iso, tz: string = DEFAULT_TIMEZONE): string {
  return fmt(
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    },
    tz,
  ).format(new Date(iso));
}

export interface Duration {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export function durationBetween(from: Iso | Date, to: Iso | Date): Duration {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  const raw = b.getTime() - a.getTime();
  const ms = Math.abs(raw);
  return {
    totalMs: raw,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
    isPast: raw < 0,
  };
}

/**
 * Compact countdown for SLA display: "2d 4h", "4h 12m", "12m 30s".
 * Two units maximum — a third unit is noise at a glance.
 */
export function formatCountdown(d: Duration): string {
  if (d.days > 0) return `${d.days}d ${d.hours}h`;
  if (d.hours > 0) return `${d.hours}h ${d.minutes}m`;
  if (d.minutes > 0) return `${d.minutes}m ${d.seconds}s`;
  return `${d.seconds}s`;
}

/** "in 2d 4h" / "overdue by 4h 12m" */
export function formatRelativeDeadline(
  dueAt: Iso,
  now: Date = new Date(),
): { text: string; isOverdue: boolean } {
  const d = durationBetween(now, dueAt);
  return d.isPast
    ? { text: `Overdue by ${formatCountdown(d)}`, isOverdue: true }
    : { text: `${formatCountdown(d)} left`, isOverdue: false };
}

/** "2 days ago" / "in 3 days" — for history and activity, not deadlines. */
export function formatRelative(iso: Iso, now: Date = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
  const diffMs = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diffMs);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, msPer] of units) {
    if (abs >= msPer) return rtf.format(Math.round(diffMs / msPer), unit);
  }
  return "just now";
}

export function addDays(iso: Iso, days: number): Iso {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function addHours(iso: Iso, hours: number): Iso {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}
