import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PublicPostStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";

/**
 * The ONLY public read of posts. Selects the redacted text and the public id —
 * never the private post id, user id or any account field.
 */
export async function getPublishedPosts(limit = 9) {
  "use cache";
  cacheTag(tags.publicPosts);
  cacheLife("minutes");

  return db.publicPost.findMany({
    where: { status: PublicPostStatus.PUBLISHED },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, text: true },
  });
}

export async function getMyPosts(userId: string) {
  return db.privatePost.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      publishConsent: true,
      consentWithdrawnAt: true,
      publicPost: { select: { status: true, publishedAt: true } },
    },
  });
}
