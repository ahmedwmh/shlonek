import "server-only";
import { connection } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCoach } from "@/features/consultations/queries";

export async function getConsultationAdmin() {
  await connection();
  const coach = await getCoach();
  const now = new Date();

  const [services, availability, timeOff, upcoming, past] = await Promise.all([
    db.consultationService.findMany({ orderBy: { sortOrder: "asc" } }),
    coach ? db.weeklyAvailability.findMany({ where: { coachId: coach.id }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }) : [],
    coach ? db.timeOff.findMany({ where: { coachId: coach.id, endsAt: { gt: now } }, orderBy: { startsAt: "asc" } }) : [],
    db.booking.findMany({
      where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.HELD] }, endsAt: { gt: now } },
      orderBy: { startsAt: "asc" },
      take: 100,
      include: bookingInclude,
    }),
    db.booking.findMany({
      where: {
        OR: [
          { endsAt: { lte: now }, status: { not: BookingStatus.EXPIRED } },
          { status: { in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.CANCELLED] } },
        ],
      },
      orderBy: { startsAt: "desc" },
      take: 50,
      include: bookingInclude,
    }),
  ]);

  return { coach, services, availability, timeOff, upcoming, past };
}

const bookingInclude = {
  user: { select: { id: true, name: true, email: true } },
  purchase: { select: { sessionsCount: true, service: { select: { title: true } } } },
} as const;
