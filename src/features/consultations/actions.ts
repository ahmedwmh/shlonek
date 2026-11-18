"use server";

import { z } from "zod";
import { getViewer } from "@/lib/auth/dal";
import { fail, ok, toFailure, type ActionResult } from "@/lib/action-result";
import { createConsultationOrder } from "./booking";

const schema = z.object({ serviceId: z.string().min(1), starts: z.array(z.iso.datetime()).min(1).max(8) });

/** Holds the chosen slot(s) and creates the order. The client then goes to checkout. */
export async function holdSlots(input: z.infer<typeof schema>): Promise<ActionResult<{ orderId: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك حتى تحجز.");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("اختار المواعيد مرة ثانية.");

  try {
    const order = await createConsultationOrder({ userId: viewer.id, ...parsed.data });
    return ok({ orderId: order.id });
  } catch (error) {
    return toFailure(error);
  }
}
