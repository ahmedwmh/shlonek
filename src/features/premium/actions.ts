"use server";

import { OrderKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { expireStaleOrders } from "@/features/payments/orders";

/** Premium is a one-off purchase of a fixed period (no auto-renew). */
export async function createPremiumOrder(planId: string): Promise<ActionResult<{ orderId: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك أول.");

  if (typeof planId !== "string" || planId.length > 64) return fail("هذي الخطة غير متاحة.");
  const plan = await db.premiumPlan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return fail("هذي الخطة غير متاحة.");

  await expireStaleOrders({ userId: viewer.id });

  // Double clicks / going back and forth reuse the same unpaid order.
  const existing = await db.order.findFirst({
    where: { userId: viewer.id, kind: OrderKind.PREMIUM, premiumPlanId: plan.id, status: "AWAITING_PAYMENT", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (existing) return ok({ orderId: existing.id });

  const order = await db.order.create({
    data: {
      userId: viewer.id,
      kind: OrderKind.PREMIUM,
      title: `بريميوم — ${plan.name}`,
      subtotal: plan.price,
      total: plan.price,
      premiumPlanId: plan.id,
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  return ok({ orderId: order.id });
}
