import "server-only";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/dal";
import { fail, type ActionResult } from "@/lib/action-result";

/**
 * Server Action guards. `requireStaff`/`requireAdmin` throw notFound() for
 * outsiders, so a forged call from a member never reaches the database.
 */
export const staff = requireStaff;
export const admin = requireAdmin;

/** Validates input with zod and returns field errors in ActionResult shape. */
export function parse<S extends z.ZodType>(schema: S, input: unknown):
  | { ok: true; data: z.infer<S> }
  | { ok: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "_");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, result: fail("تأكد من الحقول المعلّمة.", fieldErrors) };
}

/** Common zod pieces with Arabic messages. */
export const zIQD = z.coerce
  .number({ error: "اكتب رقم" })
  .int("بدون كسور")
  .min(1000, "الحد الأدنى 1,000 د.ع");
export const zId = z.string().min(1).max(64);
export const zText = (max: number, min = 1) =>
  z.string().trim().min(min, min > 1 ? `على الأقل ${min} حروف` : "مطلوب").max(max, `الحد الأقصى ${max}`);
export const zCheckbox = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());
