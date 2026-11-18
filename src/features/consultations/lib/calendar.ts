/**
 * Month-grid math for the booking calendar, anchored to Baghdad (UTC+3, no DST).
 * Days are identified by their Baghdad-midnight timestamp (same keys as `baghdadDayStart`).
 * Weeks start on Saturday, as in Iraq.
 */
const DAY = 86_400_000;
const OFFSET = 3 * 3_600_000;

export type Month = { year: number; month: number }; // month: 0–11

export const WEEKDAY_LABELS = ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"] as const;

/** Baghdad-midnight timestamp for a calendar date. */
export const dayKey = (year: number, month: number, day: number) => Date.UTC(year, month, day) - OFFSET;

/** Baghdad calendar parts of a day key (or any instant). */
export function parts(ms: number) {
  const d = new Date(ms + OFFSET);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), weekday: d.getUTCDay(), hour: d.getUTCHours() };
}

export const monthOf = (ms: number): Month => {
  const p = parts(ms);
  return { year: p.year, month: p.month };
};

export const addMonths = ({ year, month }: Month, n: number): Month => {
  const total = year * 12 + month + n;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

export const compareMonths = (a: Month, b: Month) => a.year * 12 + a.month - (b.year * 12 + b.month);

/** 6×7 grid of day keys (null = padding outside the month), Saturday first. */
export function monthGrid({ year, month }: Month): (number | null)[] {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sunday
  const lead = (first - 6 + 7) % 7; // days before the 1st since Saturday
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= length; d++) cells.push(dayKey(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

const monthFormat = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" });
export const monthLabel = ({ year, month }: Month) => monthFormat.format(new Date(Date.UTC(year, month, 15)));

export const todayKey = () => Math.floor((Date.now() + OFFSET) / DAY) * DAY - OFFSET;

/** Morning / afternoon / evening buckets for listing times (Baghdad hours). */
export function dayPeriod(ms: number) {
  const h = parts(ms).hour;
  if (h < 12) return { key: "morning", label: "الصبح" } as const;
  if (h < 17) return { key: "afternoon", label: "الظهر والعصر" } as const;
  return { key: "evening", label: "المساء" } as const;
}
