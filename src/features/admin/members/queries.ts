import "server-only";
import { connection } from "next/server";
import { Prisma, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function listMembers(filters: { q?: string; role?: string }) {
  await connection();
  const q = filters.q?.trim().slice(0, 100);
  const role = filters.role && Object.values(Role).includes(filters.role as Role) ? (filters.role as Role) : undefined;
  const now = new Date();

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  return db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      wallet: { select: { balance: true } },
      premiumPeriods: { where: { startsAt: { lte: now }, endsAt: { gt: now } }, select: { endsAt: true }, take: 1 },
      _count: { select: { attempts: true, privatePosts: true, bookings: true } },
    },
  });
}

export async function getMemberFile(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { actor: { select: { name: true } }, order: { select: { id: true, number: true } } },
          },
        },
      },
      premiumPeriods: { orderBy: { endsAt: "desc" }, include: { plan: { select: { name: true } } } },
      attempts: {
        orderBy: { completedAt: "desc" },
        include: {
          exercise: { select: { id: true, title: true } },
          version: { select: { version: true, definition: true } },
        },
      },
      purchases: {
        orderBy: { createdAt: "desc" },
        include: {
          service: { select: { title: true } },
          order: { select: { id: true, number: true, status: true } },
          bookings: { orderBy: { sequence: "asc" } },
        },
      },
      orders: { orderBy: { createdAt: "desc" }, take: 30 },
      privatePosts: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, body: true, status: true, createdAt: true } },
      staffNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
}
