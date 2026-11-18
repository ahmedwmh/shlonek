import "server-only";
import { connection } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { atBaghdadMinute, baghdadWeekday, nextBaghdadDays } from "@/lib/time";
import { getSettings } from "@/features/settings/queries";

export type Slot = { startsAt: string; endsAt: string };

/**
 * Bookable slots for the coach: weekly working hours, minus time off, minus live
 * bookings (unexpired holds, confirmed, completed), respecting minimum notice and
 * the booking horizon. Slots are back-to-back blocks of the session duration.
 */
export async function getAvailableSlots(input: { coachId: string; durationMinutes: number; days?: number }) {
  await connection(); // depends on the current time → request-time only
  const settings = await getSettings("booking");
  const now = new Date();
  const days = nextBaghdadDays(input.days ?? settings.horizonDays, now);
  const rangeStart = days[0];
  const rangeEnd = new Date(days[days.length - 1].getTime() + 86_400_000);
  const earliest = now.getTime() + settings.minNoticeHours * 3_600_000;

  const [windows, timeOff, busy] = await Promise.all([
    db.weeklyAvailability.findMany({ where: { coachId: input.coachId } }),
    db.timeOff.findMany({ where: { coachId: input.coachId, endsAt: { gt: rangeStart }, startsAt: { lt: rangeEnd } } }),
    db.booking.findMany({
      where: {
        coachId: input.coachId,
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
        OR: [
          { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
          { status: BookingStatus.HELD, holdExpiresAt: { gt: now } },
        ],
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const blocked = [...timeOff, ...busy].map((b) => [b.startsAt.getTime(), b.endsAt.getTime()] as const);
  const durationMs = input.durationMinutes * 60_000;
  const slots: Slot[] = [];

  for (const day of days) {
    const weekday = baghdadWeekday(day);
    for (const w of windows.filter((x) => x.weekday === weekday)) {
      for (let minute = w.startMinute; minute + input.durationMinutes <= w.endMinute; minute += input.durationMinutes) {
        const start = atBaghdadMinute(day, minute).getTime();
        const end = start + durationMs;
        if (start < earliest) continue;
        if (blocked.some(([bs, be]) => start < be && end > bs)) continue;
        slots.push({ startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
