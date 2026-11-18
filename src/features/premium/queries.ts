import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";

export async function getActivePremiumPlans() {
  "use cache";
  cacheTag(tags.premiumPlans);
  cacheLife("hours");
  return db.premiumPlan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { durationDays: "asc" }] });
}

/** The member's current premium period (if any) and the last day they're covered until. */
export async function getPremiumStatus(userId: string) {
  await connection();
  const now = new Date();
  const periods = await db.premiumPeriod.findMany({
    where: { userId, endsAt: { gt: now } },
    orderBy: { endsAt: "desc" },
    include: { plan: { select: { name: true } } },
  });
  const active = periods.find((p) => p.startsAt <= now) ?? null;
  const coveredUntil = periods[0]?.endsAt ?? null;
  return { isPremium: Boolean(active), active, coveredUntil, upcoming: periods.filter((p) => p.startsAt > now) };
}

export async function isPremiumMember(userId: string) {
  return (await getPremiumStatus(userId)).isPremium;
}
