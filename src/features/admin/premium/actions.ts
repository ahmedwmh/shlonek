"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tags } from "@/lib/cache-tags";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { admin, parse, zCheckbox, zIQD, zId, zText } from "../shared/guard";

const planSchema = z.object({
  name: zText(40, 1),
  durationDays: z.coerce.number().int().min(1, "يوم واحد على الأقل").max(730, "الحد سنتين"),
  price: zIQD,
  isActive: zCheckbox,
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export async function createPlan(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(planSchema, input);
  if (!v.ok) return v.result;
  const plan = await db.premiumPlan.create({ data: v.data });
  await audit({ actorId: viewer.id, action: "price.premium.create", entityType: "PremiumPlan", entityId: plan.id, meta: { price: plan.price } });
  updateTag(tags.premiumPlans);
  refresh();
  return ok(undefined, "انضافت الخطة");
}

export async function updatePlan(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(planSchema.extend({ id: zId }), input);
  if (!v.ok) return v.result;
  const { id, ...data } = v.data;
  const before = await db.premiumPlan.findUnique({ where: { id }, select: { price: true, durationDays: true } });
  if (!before) return fail("الخطة غير موجودة.");
  await db.premiumPlan.update({ where: { id }, data });
  if (before.price !== data.price || before.durationDays !== data.durationDays) {
    await audit({
      actorId: viewer.id,
      action: "price.premium",
      entityType: "PremiumPlan",
      entityId: id,
      meta: { price: [before.price, data.price], days: [before.durationDays, data.durationDays] },
    });
  }
  updateTag(tags.premiumPlans);
  refresh();
  return ok(undefined, "انحفظت الخطة");
}

/** Plans that were ever bought are deactivated, never deleted. */
export async function deletePlan(id: string): Promise<ActionResult> {
  const viewer = await admin();
  const plan = await db.premiumPlan.findUnique({ where: { id }, include: { _count: { select: { periods: true, orders: true } } } });
  if (!plan) return fail("الخطة غير موجودة.");
  if (plan._count.periods + plan._count.orders > 0) {
    await db.premiumPlan.update({ where: { id }, data: { isActive: false } });
    await audit({ actorId: viewer.id, action: "premium.plan.deactivate", entityType: "PremiumPlan", entityId: id });
    updateTag(tags.premiumPlans);
    refresh();
    return ok(undefined, "الخطة مستخدمة، فتعطّلت بدل الحذف");
  }
  await db.premiumPlan.delete({ where: { id } });
  await audit({ actorId: viewer.id, action: "premium.plan.delete", entityType: "PremiumPlan", entityId: id });
  updateTag(tags.premiumPlans);
  refresh();
  return ok(undefined, "انحذفت الخطة");
}
