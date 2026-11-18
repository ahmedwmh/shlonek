"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { fail, type ActionResult } from "@/lib/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEV_SESSION_COOKIE, devSessionCookieOptions, encodeDevSession } from "@/lib/auth/dev-session";
import { ensureUser, requireViewer } from "@/lib/auth/dal";
import { getCurrentTermsVersion } from "@/features/policies/queries";

/**
 * In production the OAuth return URL always comes from configuration — never from
 * request headers (Host/X-Forwarded-Host can be spoofed). Locally we follow the
 * actual host so the dev port works.
 */
async function siteOrigin() {
  if (env.NODE_ENV === "production") return env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : env.NEXT_PUBLIC_SITE_URL;
}

/** Starts Google sign-in and comes back to `next` (the service the member chose). */
export async function signInWithGoogle(_: unknown, formData: FormData): Promise<ActionResult> {
  const next = safeNext(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("تسجيل الدخول بـ Google مو مفعّل بعد.");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return fail("ما گدرنا نبدي تسجيل الدخول، جرّب مرة ثانية.");
  redirect(data.url);
}

const devSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  name: z.string().trim().min(2).max(60),
  next: z.string().optional(),
});

/** Development-only sign-in, so flows can be tested without a Supabase project. */
export async function devSignIn(_: unknown, formData: FormData): Promise<ActionResult> {
  if (!features.devLogin) return fail("غير متاح.");
  const parsed = devSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("اكتب اسم وبريد صحيحين.");

  const { email, name } = parsed.data;
  const user = await ensureUser({ authId: `dev:${email}`, email, name, avatarUrl: null });
  (await cookies()).set(DEV_SESSION_COOKIE, encodeDevSession({ email, name }), devSessionCookieOptions);

  const next = safeNext(parsed.data.next);
  const termsVersion = await getCurrentTermsVersion();
  redirect(user.termsVersion === termsVersion ? next : `/welcome?next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  (await cookies()).delete(DEV_SESSION_COOKIE);
  redirect("/");
}

/** First sign-in: record the accepted privacy/terms version, then continue. */
export async function acceptTerms(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const viewer = await requireViewer(`/welcome?next=${encodeURIComponent(next)}`);
  const version = await getCurrentTermsVersion();
  await db.user.update({
    where: { id: viewer.id },
    data: { termsVersion: version, termsAcceptedAt: new Date() },
  });
  redirect(next);
}
