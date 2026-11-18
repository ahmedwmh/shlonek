import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env, features } from "@/lib/env";

/**
 * Wayl (https://wayl.io/docs) — Iraqi payment links, IQD only, min 1,000 IQD.
 * We create one link per payment attempt; the order is marked paid only after a
 * signed webhook (or a server-side status lookup), never from the redirect.
 */

export const WAYL_MIN_AMOUNT = 1000;

const linkSchema = z.object({
  referenceId: z.string(),
  id: z.string().optional(),
  code: z.string().optional(),
  url: z.string().optional(),
  status: z.string(),
  total: z.union([z.string(), z.number()]).optional(),
  completedAt: z.string().nullable().optional(),
});
export type WaylLink = z.infer<typeof linkSchema>;

/** Link statuses that mean the money arrived. */
export const WAYL_PAID_STATUSES = new Set(["Complete", "Delivered"]);
export const WAYL_FAILED_STATUSES = new Set(["Cancelled", "Rejected", "Returned"]);

async function request<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  if (!features.wayl) throw new Error("Wayl is not configured");
  const res = await fetch(`${env.WAYL_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-WAYL-AUTHENTICATION": env.WAYL_API_KEY!,
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[wayl]", path, res.status, (json as { message?: string }).message);
    throw new Error(`Wayl ${res.status}`);
  }
  return z.object({ data: schema }).parse(json).data;
}

export async function createWaylLink(input: {
  referenceId: string;
  total: number;
  label: string;
  redirectionUrl: string;
  webhookUrl: string;
  expiresInMinutes: number;
}) {
  return request(
    "/api/v1/links",
    {
      method: "POST",
      body: JSON.stringify({
        env: env.WAYL_ENV,
        referenceId: input.referenceId,
        total: input.total,
        currency: "IQD",
        lineItem: [{ label: input.label.slice(0, 255).padEnd(3, " "), amount: input.total, type: "increase" }],
        webhookUrl: input.webhookUrl,
        webhookSecret: env.WAYL_WEBHOOK_SECRET,
        redirectionUrl: input.redirectionUrl,
        linkExpiresIn: `${Math.max(1, Math.round(input.expiresInMinutes))}m`,
      }),
    },
    linkSchema,
  );
}

export async function getWaylLink(referenceId: string) {
  return request(`/api/v1/links/${encodeURIComponent(referenceId)}`, { method: "GET" }, linkSchema);
}

export async function invalidateWaylLinkIfPending(referenceId: string) {
  try {
    await request(
      `/api/v1/links/${encodeURIComponent(referenceId)}/invalidate-if-pending`,
      { method: "POST" },
      z.unknown(),
    );
  } catch {
    // Best effort: an expired link can't be paid anyway.
  }
}

export async function createWaylRefund(input: { referenceId: string; amount: number; reason: string }) {
  return request(
    "/api/v1/refunds",
    {
      method: "POST",
      // Wayl requires a 100–1500 character reason.
      body: JSON.stringify({ ...input, reason: input.reason.padEnd(100, ".").slice(0, 1500) }),
    },
    z.object({ id: z.string(), status: z.string() }),
  );
}

/** HMAC-SHA256 of the raw body with our webhook secret, hex, compared in constant time. */
export function verifyWaylSignature(rawBody: string, signature: string | null) {
  if (!signature || !env.WAYL_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", env.WAYL_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const given = signature.replace(/^sha256=/, "").trim();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

export const waylWebhookSchema = z
  .object({
    referenceId: z.string(),
    paymentStatus: z.string().optional(),
    event: z.string().optional(),
    total: z.union([z.number(), z.string()]).optional(),
  })
  .loose();
