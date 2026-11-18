import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";
import { PLATFORM_TIMEZONE } from "./format";

/** Calendar helpers anchored to Asia/Baghdad, regardless of the server's timezone. */

export function baghdadNow(now = new Date()) {
  return new TZDate(now, PLATFORM_TIMEZONE);
}

/** Midnight (Baghdad) of the given instant's day. */
export function baghdadStartOfDay(date: Date) {
  return startOfDay(new TZDate(date, PLATFORM_TIMEZONE));
}

/** Instant for `minute` minutes after Baghdad midnight of `day`. */
export function atBaghdadMinute(day: Date, minute: number) {
  const base = baghdadStartOfDay(day);
  return new Date(base.getTime() + minute * 60_000);
}

/** 0 = Sunday … 6 = Saturday, in Baghdad. */
export function baghdadWeekday(date: Date) {
  return new TZDate(date, PLATFORM_TIMEZONE).getDay();
}

/** yyyy-mm-dd key of the Baghdad calendar day. */
export function baghdadDayKey(date: Date) {
  const d = new TZDate(date, PLATFORM_TIMEZONE);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new TZDate(y, m - 1, d, PLATFORM_TIMEZONE);
}

export function nextBaghdadDays(count: number, from = new Date()) {
  const start = baghdadStartOfDay(from);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export const minutesToLabel = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
