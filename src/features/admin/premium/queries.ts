import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";

export async function getPremiumAdmin() {
  await connection();
  const now = new Date();
  const [plans, periods] = await Promise.all([
    db.premiumPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { durationDays: "asc" }],
      include: { _count: { select: { periods: true, orders: true } } },
    }),
    db.premiumPeriod.findMany({
      where: { endsAt: { gt: now } },
      orderBy: { endsAt: "asc" },
      take: 200,
      include: { user: { select: { id: true, name: true } }, plan: { select: { name: true } } },
    }),
  ]);
  return { plans, periods, now };
}
