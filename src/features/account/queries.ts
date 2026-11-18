import "server-only";
import { db } from "@/lib/db";

export async function getMyOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { refunds: { select: { amount: true, status: true } } },
  });
}

export async function getMyPremiumPeriods(userId: string) {
  return db.premiumPeriod.findMany({
    where: { userId },
    orderBy: { startsAt: "desc" },
    include: { plan: { select: { name: true } } },
  });
}

export async function getMyProfile(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, phone: true, contactByEmail: true, contactByPhone: true, deletionRequestedAt: true },
  });
}
