import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Signed cookie used by the development-only email login, so the whole app can
 * be exercised locally without a Supabase project. Disabled in production.
 */
export const DEV_SESSION_COOKIE = "shlonek_dev_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type DevIdentity = { email: string; name: string };

function sign(payload: string) {
  return createHmac("sha256", env.SESSION_SECRET!).update(payload).digest("base64url");
}

export function encodeDevSession(identity: DevIdentity) {
  const payload = Buffer.from(
    JSON.stringify({ ...identity, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeDevSession(value: string | undefined): DevIdentity | null {
  if (!value || !env.SESSION_SECRET) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as DevIdentity & { exp: number };
    if (data.exp < Date.now() / 1000) return null;
    return { email: data.email, name: data.name };
  } catch {
    return null;
  }
}

export const devSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
