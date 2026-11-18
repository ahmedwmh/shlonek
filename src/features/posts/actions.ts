"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { Prisma, PublicPostStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/dal";
import { tags } from "@/lib/cache-tags";
import { fail, ok, toFailure, type ActionResult } from "@/lib/action-result";
import { tellMeSchema, type TellMeInput } from "./schema";
import { cleanText } from "./sanitize";
import { notifyAdminsOfNewPost } from "./notify";

/**
 * «احچيلي» submit. Login is enforced here (not just in the UI). The private text
 * is always stored; a public copy is created only with explicit consent and stays
 * PENDING_REVIEW until staff redact and publish it.
 */
export async function submitPost(input: TellMeInput): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك حتى ترسل.");

  const parsed = tellMeSchema.safeParse({ ...input, body: cleanText(input.body ?? "") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "تأكد من النص.");
  const { body, publishConsent, clientRequestId } = parsed.data;

  // Light rate limit: at most 5 posts per 10 minutes per member.
  const recent = await db.privatePost.count({
    where: { userId: viewer.id, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } },
  });
  if (recent >= 5) return fail("أرسلت كثير بوقت قصير، استراح شوية وارجع.");

  let postId: string;
  try {
    const post = await db.privatePost.create({
      data: {
        userId: viewer.id,
        body,
        clientRequestId,
        publishConsent,
        consentAt: publishConsent ? new Date() : null,
        publicPost: publishConsent ? { create: { text: body, status: PublicPostStatus.PENDING_REVIEW } } : undefined,
      },
      select: { id: true },
    });
    postId = post.id;
  } catch (error) {
    // Same clientRequestId = double click / retry: the first one already landed.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return ok();
    return toFailure(error);
  }
  // Tell the team after the response is sent: never slows down or breaks the member's submit.
  after(() => notifyAdminsOfNewPost({ postId, publishConsent }));
  return ok(undefined, "وصلت رسالتك");
}

/** Member withdraws public consent: hides the public copy immediately, keeps the private record. */
export async function withdrawConsent(postId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك.");

  const post = await db.privatePost.findFirst({ where: { id: postId, userId: viewer.id }, select: { id: true } });
  if (!post) return fail("المشاركة غير موجودة.");

  await db.$transaction([
    db.privatePost.update({
      where: { id: post.id },
      data: { publishConsent: false, consentWithdrawnAt: new Date() },
    }),
    db.publicPost.updateMany({ where: { privatePostId: post.id }, data: { status: PublicPostStatus.HIDDEN } }),
  ]);
  updateTag(tags.publicPosts);
  return ok(undefined, "سحبنا موافقتك، وما راح تنعرض المشاركة.");
}
