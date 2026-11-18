/**
 * Monthly package rule (pure, shared by client and server):
 * 4 sessions, one in each consecutive 7-day "package week" counted from the
 * Baghdad day of the first session. Week k = [day0 + 7k, day0 + 7k + 7).
 */
const DAY = 86_400_000;
const BAGHDAD_OFFSET = 3 * 3_600_000; // Iraq is UTC+3 all year (no DST).

/** Baghdad-midnight timestamp of the instant's day. */
export function baghdadDayStart(ms: number) {
  return Math.floor((ms + BAGHDAD_OFFSET) / DAY) * DAY - BAGHDAD_OFFSET;
}

export function packageWeekIndex(firstStart: number, start: number) {
  return Math.floor((baghdadDayStart(start) - baghdadDayStart(firstStart)) / (7 * DAY));
}

export function packageWeekRange(firstStart: number, week: number) {
  const from = baghdadDayStart(firstStart) + week * 7 * DAY;
  return { from, to: from + 7 * DAY };
}

/** True when `starts` (any order) has exactly one session in each package week. */
export function isValidPackageSchedule(starts: number[], sessions: number) {
  if (starts.length !== sessions) return false;
  const sorted = [...starts].sort((a, b) => a - b);
  return sorted.every((s, i) => packageWeekIndex(sorted[0], s) === i);
}

/**
 * Suggest the remaining sessions: same weekday and time each following week,
 * or the closest available slot inside that package week.
 */
export function suggestPackageSlots(firstStart: number, sessions: number, available: number[]) {
  const picks: (number | null)[] = [firstStart];
  for (let week = 1; week < sessions; week++) {
    const ideal = firstStart + week * 7 * DAY;
    const { from, to } = packageWeekRange(firstStart, week);
    const candidates = available.filter((s) => s >= from && s < to);
    if (candidates.length === 0) {
      picks.push(null);
      continue;
    }
    picks.push(candidates.reduce((best, s) => (Math.abs(s - ideal) < Math.abs(best - ideal) ? s : best)));
  }
  return picks;
}
