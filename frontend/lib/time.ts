// Time helpers. The browser's time zone is the source of truth for "today".

/** Today's local calendar day as UTC instants: [start, end). Sent to the API. */
export function todayWindow(now = new Date()): { dayStart: string; dayEnd: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // new Date(y, m, d + 1) handles month ends and DST days (23 or 25 hours) correctly.
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() };
}

/** Number of local calendar days from `a` to `b` (ignores the time of day). */
function calendarDaysBetween(a: Date, b: Date): number {
  const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((dayB.getTime() - dayA.getTime()) / 86_400_000);
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** "just now", "5 minutes ago", "2 hours ago", "3 days ago", ... */
export function timeAgo(iso: string, now = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${plural(minutes, "minute")} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${plural(hours, "hour")} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${plural(days, "day")} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${plural(months, "month")} ago`;
  return `${plural(Math.floor(days / 365), "year")} ago`;
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const shortDateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "14 Oct 2026, 3:30 pm" in the browser's locale and time zone. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Short follow-up label: "Today, 3:30 pm", "Tomorrow, 9:00 am" or "Fri, 17 Oct, 9:00 am". */
export function formatFollowUp(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = calendarDaysBetween(now, date);
  if (days === 0) return `Today, ${timeFormat.format(date)}`;
  if (days === 1) return `Tomorrow, ${timeFormat.format(date)}`;
  if (days === -1) return `Yesterday, ${timeFormat.format(date)}`;
  return shortDateTimeFormat.format(date);
}

/**
 * How a lead's follow-up should be displayed.
 *  - "overdue":        before the start of today (server flag is_overdue; never Won/Lost)
 *  - "due-earlier":    today, but the time has already passed (softer warning)
 *  - "today":          today, still upcoming
 *  - "scheduled":      a future day, or a closed (Won/Lost) lead's old follow-up
 *  - "none":           no follow-up set
 */
export type FollowUpState = "overdue" | "due-earlier" | "today" | "scheduled" | "none";

export function followUpState(
  lead: { next_follow_up_at: string | null; follow_up_today: boolean; is_overdue: boolean },
  now = new Date(),
): FollowUpState {
  if (!lead.next_follow_up_at) return "none";
  if (lead.is_overdue) return "overdue";
  if (lead.follow_up_today) {
    return new Date(lead.next_follow_up_at) < now ? "due-earlier" : "today";
  }
  return "scheduled";
}

/** "Overdue by 2 days" (counted in calendar days, so yesterday 11pm = 1 day). */
export function overdueLabel(iso: string, now = new Date()): string {
  const days = Math.max(1, calendarDaysBetween(new Date(iso), now));
  return `Overdue by ${plural(days, "day")}`;
}

/** <input type="datetime-local"> gives "2026-10-14T23:30" (local, no zone). Convert to UTC ISO. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}
