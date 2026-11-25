import { type NextRequest, NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

/** Must match DEV_SESSION_COOKIE in lib/auth/dev-session.ts (kept literal: proxy can't import server-only code). */
const DEV_SESSION_COOKIE = "shlonek_dev_session";

/** Members-only areas. This is an optimistic redirect for UX — the real check is in the DAL. */
const PROTECTED_PREFIXES = ["/account", "/checkout"];

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // Supabase falls back to its "Site URL" (the home page) when the requested return
  // address isn't on its allow list. Finish that sign-in instead of dropping the code.
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const { response, hasUser } = await updateSupabaseSession(request);

  const signedIn = hasUser || request.cookies.has(DEV_SESSION_COOKIE);

  // Staff area: signed-out visitors get a real 404 (its existence isn't advertised).
  // Role checks for signed-in members happen in the DAL (requireStaff).
  if (!signedIn && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
  }

  if (!signedIn && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static files, images (incl. course covers) and the payment webhook (signed, server-to-server).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|api/webhooks|courses/[^/]+/cover|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
