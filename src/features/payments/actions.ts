"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/dal";
import { fail, ok, toFailure, type ActionResult } from "@/lib/action-result";
import { cancelOpenOrder, expireStaleOrders, payOrderWithWallet, startGatewayPayment } from "./orders";

const idSchema = z.string().min(1).max(40);

/**
 * A course order must not be paid twice: if the member already owns the course
 * (bought it in another tab, or staff granted it), cancel this order instead.
 */
async function ownedCourseBlocks(orderId: string, userId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId, kind: "COURSE", status: "AWAITING_PAYMENT" },
    select: { courseId: true },
  });
  if (!order?.courseId) return false;
  const owned = await db.courseEnrollment.findFirst({
    where: { userId, courseId: order.courseId, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
    select: { id: true },
  });
  if (!owned) return false;
  await cancelOpenOrder(orderId, userId);
  return true;
}

export async function payWithWallet(orderId: string): Promise<ActionResult<{ status: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك.");
  if (!idSchema.safeParse(orderId).success) return fail("طلب غير صحيح.");
  try {
    // Settle this member's lapsed orders first so reserved money is released.
    await expireStaleOrders({ userId: viewer.id });
    if (await ownedCourseBlocks(orderId, viewer.id)) return fail("الكورس موجود بكورساتك، فلغينا هذا الطلب.");
    const status = await payOrderWithWallet(orderId, viewer.id);
    return ok({ status });
  } catch (error) {
    return toFailure(error);
  }
}

/** Returns Wayl's checkout URL; the client navigates there. */
export async function payWithGateway(orderId: string, useWallet: boolean): Promise<ActionResult<{ url: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك.");
  if (!idSchema.safeParse(orderId).success) return fail("طلب غير صحيح.");
  try {
    await expireStaleOrders({ userId: viewer.id });
    if (await ownedCourseBlocks(orderId, viewer.id)) return fail("الكورس موجود بكورساتك، فلغينا هذا الطلب.");
    const url = await startGatewayPayment(orderId, viewer.id, Boolean(useWallet));
    return ok({ url });
  } catch (error) {
    return toFailure(error);
  }
}

export async function cancelOrder(orderId: string) {
  const viewer = await getViewer();
  if (!viewer) return;
  if (!idSchema.safeParse(orderId).success) return;
  const order = await db.order.findFirst({
    where: { id: orderId, userId: viewer.id },
    select: { kind: true, course: { select: { slug: true } } },
  });
  await cancelOpenOrder(orderId, viewer.id);
  // Back to where this purchase started.
  redirect(order?.course ? `/courses/${encodeURIComponent(order.course.slug)}` : order?.kind === "PREMIUM" ? "/premium" : "/consultations");
}
