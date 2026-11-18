"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth/dal";
import { fail, ok, toFailure, type ActionResult } from "@/lib/action-result";
import { cancelOpenOrder, expireStaleOrders, payOrderWithWallet, startGatewayPayment } from "./orders";

const idSchema = z.string().min(1).max(40);

export async function payWithWallet(orderId: string): Promise<ActionResult<{ status: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك.");
  if (!idSchema.safeParse(orderId).success) return fail("طلب غير صحيح.");
  try {
    // Settle this member's lapsed orders first so reserved money is released.
    await expireStaleOrders({ userId: viewer.id });
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
    const url = await startGatewayPayment(orderId, viewer.id, Boolean(useWallet));
    return ok({ url });
  } catch (error) {
    return toFailure(error);
  }
}

export async function cancelOrder(orderId: string) {
  const viewer = await getViewer();
  if (!viewer) return;
  await cancelOpenOrder(orderId, viewer.id);
  redirect("/consultations");
}
