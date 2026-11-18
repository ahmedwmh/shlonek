/**
 * Display formatting shared by server and client.
 * Arabic text with Latin digits (25,000 د.ع) — the common choice in Iraqi apps.
 */
export const PLATFORM_TIMEZONE = "Asia/Baghdad";
const LOCALE = "ar-IQ-u-nu-latn";

const numberFormat = new Intl.NumberFormat("en-US");

export function formatIQD(amount: number) {
  return `${numberFormat.format(amount)} د.ع`;
}

export function formatNumber(n: number) {
  return numberFormat.format(n);
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: PLATFORM_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: PLATFORM_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: PLATFORM_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayLabelFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: PLATFORM_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

export const formatDate = (d: Date | string) => dateFormat.format(new Date(d));
export const formatShortDate = (d: Date | string) => shortDateFormat.format(new Date(d));
export const formatTime = (d: Date | string) => timeFormat.format(new Date(d));
export const formatDayLabel = (d: Date | string) => dayLabelFormat.format(new Date(d));
export const formatDateTime = (d: Date | string) => `${formatDate(d)} · ${formatTime(d)}`;

/** "قبل ٣ دقائق" style relative time. */
export function formatRelative(d: Date | string, now = new Date()) {
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const diffSec = Math.round((new Date(d).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatShortDate(d);
}

export function pluralizeSessions(n: number) {
  if (n === 1) return "جلسة واحدة";
  if (n === 2) return "جلستين";
  if (n <= 10) return `${n} جلسات`;
  return `${n} جلسة`;
}
