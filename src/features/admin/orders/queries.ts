import "server-only";
import { OrderStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function listOrders(filters: { status?: string; q?: string }) {
  const status =
    filters.status && Object.values(OrderStatus).includes(filters.status as OrderStatus) ? (filters.status as OrderStatus) : undefined;
  const q = filters.q?.trim().slice(0, 100);
  const number = q && /^\d+$/.test(q) ? Number(q) : undefined;

  return db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              ...(number ? [{ number }] : []),
              { user: { name: { contains: q, mode: "insensitive" as const } } },
              { user: { email: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function getOrderAdmin(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      premiumPlan: { select: { name: true, durationDays: true } },
      premiumPeriod: true,
      consultation: { include: { service: { select: { title: true } }, bookings: { orderBy: { sequence: "asc" } } } },
      paymentEvents: { orderBy: { receivedAt: "desc" } },
      walletTxs: { orderBy: { createdAt: "desc" } },
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });
}
