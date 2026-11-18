import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthIdentity } from "@/lib/auth/session";
import { ensureUser } from "@/lib/auth/dal";
import { safeNext } from "@/lib/safe-next";
import { getCurrentTermsVersion } from "@/features/policies/queries";
import { env } from "@/lib/env";

/** Google → Supabase → here. Creates the session, syncs the profile, returns to the chosen service. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Redirect targets are built from configuration in production, never from the Host header.
  const origin = env.NODE_ENV === "production" ? env.NEXT_PUBLIC_SITE_URL : request.nextUrl.origin;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const failed = NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}&error=1`);

  const supabase = await createSupabaseServerClient();
  if (!code || !supabase) return failed;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failed;

  const identity = await getAuthIdentity();
  if (!identity) return failed;

  const user = await ensureUser(identity);
  const termsVersion = await getCurrentTermsVersion();
  const destination = user.termsVersion === termsVersion ? next : `/welcome?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(`${origin}${destination}`);
}
