import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PolicyKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";

export const policySlugs = {
  privacy: PolicyKind.PRIVACY,
  terms: PolicyKind.TERMS,
  booking: PolicyKind.BOOKING,
  payment: PolicyKind.PAYMENT,
} as const;
export type PolicySlug = keyof typeof policySlugs;

export async function getLatestPolicy(kind: PolicyKind) {
  "use cache";
  cacheTag(tags.policies);
  cacheLife("hours");
  return db.policy.findFirst({ where: { kind }, orderBy: { publishedAt: "desc" } });
}

/** Version members must accept on first sign-in (privacy + terms are versioned together). */
export async function getCurrentTermsVersion() {
  const terms = await getLatestPolicy(PolicyKind.TERMS);
  return terms?.version ?? "1";
}
