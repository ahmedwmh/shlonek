import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { BookingStatus, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";

export async function getActiveServices() {
  "use cache";
  cacheTag(tags.consultationServices);
  cacheLife("hours");
  return db.consultationService.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function getActiveService(id: string) {
  "use cache";
  cacheTag(tags.consultationServices);
  cacheLife("hours");
  return db.consultationService.findFirst({ where: { id, isActive: true } });
}

/** One coach today: the owner (first admin). The model supports more later. */
export async function getCoach() {
  return db.user.findFirst({ where: { role: Role.ADMIN }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
}

export async function getMyConsultations(userId: string) {
  return db.consultationPurchase.findMany({
    // Only bookings that were actually paid (incl. later refunded/reviewed) — never
    // unpaid holds that expired or were cancelled before payment.
    where: { userId, order: { paidAt: { not: null } } },
    orderBy: { createdAt: "desc" },
    include: {
      service: { select: { title: true, kind: true, durationMinutes: true, deliveryMethod: true } },
      order: { select: { number: true, status: true } },
      bookings: {
        where: { status: { not: BookingStatus.EXPIRED } },
        orderBy: { sequence: "asc" },
        select: { id: true, sequence: true, startsAt: true, endsAt: true, status: true, meetingUrl: true },
      },
    },
  });
}

export async function getNextBooking(userId: string) {
  await connection();
  return db.booking.findFirst({
    where: { userId, status: BookingStatus.CONFIRMED, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { purchase: { include: { service: { select: { title: true } } } } },
  });
}
