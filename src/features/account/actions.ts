"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/dal";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { audit } from "@/lib/audit";

const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d\s-]*$/, "رقم غير صحيح.")
    .transform((v) => v || null),
  contactByEmail: z.boolean(),
  contactByPhone: z.boolean(),
});

/** Optional phone + contact preferences. Phone is private, never public. */
export async function updateProfile(_: unknown, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك.");
  const parsed = profileSchema.safeParse({
    phone: formData.get("phone") ?? "",
    contactByEmail: formData.get("contactByEmail") === "on",
    contactByPhone: formData.get("contactByPhone") === "on",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "تأكد من البيانات.");
  await db.user.update({ where: { id: viewer.id }, data: parsed.data });
  return ok(undefined, "انحفظت التغييرات");
}

/** Deletion is handled by staff under the retention policy; purchases records are kept. */
export async function requestAccountDeletion(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك.");
  await db.user.update({ where: { id: viewer.id }, data: { deletionRequestedAt: new Date() } });
  await audit({ actorId: viewer.id, action: "account.deletion_requested", entityType: "User", entityId: viewer.id });
  return ok(undefined, "وصلنا طلبك، وراح نتواصل وياك.");
}
