import "server-only";
import { connection } from "next/server";
import {
  BookingStatus,
  OrderStatus,
  PrivatePostStatus,
  PublicPostStatus,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Small counts for the sidebar badges. */
export async function getSidebarCounts() {
  const [inbox, orders] = await Promise.all([
    db.privatePost.count({ where: { status: PrivatePostStatus.NEW } }),
    db.order.count({ where: { status: OrderStatus.NEEDS_REVIEW } }),
  ]);
  return { inbox, orders };
}

export async function getDashboard() {
  await connection();
  const now = new Date();
  const inWeek = new Date(now.getTime() + 7 * 86_400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [newPosts, pendingPublic, upcoming, attempts, premiumMembers, needsReview, verifying, nextBookings] =
    await Promise.all([
      db.privatePost.count({ where: { status: PrivatePostStatus.NEW } }),
      db.publicPost.count({ where: { status: PublicPostStatus.PENDING_REVIEW } }),
      db.booking.count({ where: { status: BookingStatus.CONFIRMED, startsAt: { gte: now, lt: inWeek } } }),
      db.exerciseAttempt.count({ where: { completedAt: { gte: weekAgo } } }),
      db.premiumPeriod
        .findMany({ where: { startsAt: { lte: now }, endsAt: { gt: now } }, distinct: ["userId"], select: { userId: true } })
        .then((r) => r.length),
      db.order.count({ where: { status: OrderStatus.NEEDS_REVIEW } }),
      db.order.count({ where: { status: OrderStatus.VERIFYING } }),
      db.booking.findMany({
        where: { status: BookingStatus.CONFIRMED, startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 8,
        select: {
          id: true,
          startsAt: true,
          sequence: true,
          meetingUrl: true,
          user: { select: { id: true, name: true } },
          purchase: { select: { sessionsCount: true, service: { select: { title: true } } } },
        },
      }),
    ]);

  return { newPosts, pendingPublic, upcoming, attempts, premiumMembers, needsReview, verifying, nextBookings };
}
