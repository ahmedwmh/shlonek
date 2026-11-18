"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { PrivatePostStatus, PublicPostStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tags } from "@/lib/cache-tags";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { cleanText } from "@/features/posts/sanitize";
import { parse, staff, zId, zText } from "../shared/guard";

export async function setPostStatus(input: { id: string; status: string }): Promise<ActionResult> {
  await staff();
  const v = parse(z.object({ id: zId, status: z.enum(PrivatePostStatus) }), input);
  if (!v.ok) return v.result;
  await db.privatePost.update({ where: { id: v.data.id }, data: { status: v.data.status } });
  refresh();
  return ok(undefined, "تم تحديث الحالة");
}

export async function addStaffNote(input: { postId: string; body: string }): Promise<ActionResult> {
  const viewer = await staff();
  const v = parse(z.object({ postId: zId, body: zText(2000, 2) }), input);
  if (!v.ok) return v.result;
  const post = await db.privatePost.findUnique({ where: { id: v.data.postId }, select: { userId: true } });
  if (!post) return fail("الرسالة غير موجودة.");
  await db.staffNote.create({
    data: { subjectId: post.userId, authorId: viewer.id, privatePostId: v.data.postId, body: cleanText(v.data.body) },
  });
  refresh();
  return ok(undefined, "انحفظت الملاحظة");
}

async function loadPublic(postId: string) {
  return db.privatePost.findUnique({
    where: { id: postId },
    select: { publishConsent: true, consentWithdrawnAt: true, publicPost: { select: { id: true, status: true } } },
  });
}

/** Saves the redacted public text (never changes the member's original). */
export async function savePublicText(input: { postId: string; text: string }): Promise<ActionResult> {
  const viewer = await staff();
  const v = parse(z.object({ postId: zId, text: zText(2000, 5) }), input);
  if (!v.ok) return v.result;
  const post = await loadPublic(v.data.postId);
  if (!post?.publicPost) return fail("ما كو نسخة عامة لهذي الرسالة.");
  await db.publicPost.update({
    where: { id: post.publicPost.id },
    data: { text: cleanText(v.data.text), reviewedById: viewer.id, reviewedAt: new Date() },
  });
  if (post.publicPost.status === PublicPostStatus.PUBLISHED) updateTag(tags.publicPosts);
  refresh();
  return ok(undefined, "انحفظ النص العام");
}

export async function publishPublicPost(postId: string): Promise<ActionResult> {
  const viewer = await staff();
  if (!zId.safeParse(postId).success) return fail("طلب غير صحيح.");
  const post = await loadPublic(postId);
  if (!post?.publicPost) return fail("ما كو نسخة عامة لهذي الرسالة.");
  if (!post.publishConsent || post.consentWithdrawnAt) return fail("صاحب الرسالة ما موافق على النشر.");

  await db.publicPost.update({
    where: { id: post.publicPost.id },
    data: { status: PublicPostStatus.PUBLISHED, publishedAt: new Date(), reviewedById: viewer.id, reviewedAt: new Date(), rejectionReason: null },
  });
  await audit({ actorId: viewer.id, action: "public_post.publish", entityType: "PublicPost", entityId: post.publicPost.id });
  updateTag(tags.publicPosts);
  refresh();
  return ok(undefined, "انتشرت المشاركة بدون هوية");
}

export async function hidePublicPost(postId: string): Promise<ActionResult> {
  const viewer = await staff();
  const post = await loadPublic(postId);
  if (!post?.publicPost) return fail("ما كو نسخة عامة.");
  await db.publicPost.update({
    where: { id: post.publicPost.id },
    data: { status: PublicPostStatus.HIDDEN, reviewedById: viewer.id, reviewedAt: new Date() },
  });
  await audit({ actorId: viewer.id, action: "public_post.hide", entityType: "PublicPost", entityId: post.publicPost.id });
  updateTag(tags.publicPosts);
  refresh();
  return ok(undefined, "انخفت المشاركة");
}

export async function rejectPublicPost(input: { postId: string; reason: string }): Promise<ActionResult> {
  const viewer = await staff();
  const v = parse(z.object({ postId: zId, reason: zText(500, 3) }), input);
  if (!v.ok) return v.result;
  const post = await loadPublic(v.data.postId);
  if (!post?.publicPost) return fail("ما كو نسخة عامة.");
  await db.publicPost.update({
    where: { id: post.publicPost.id },
    data: { status: PublicPostStatus.REJECTED, rejectionReason: v.data.reason, reviewedById: viewer.id, reviewedAt: new Date() },
  });
  await audit({
    actorId: viewer.id,
    action: "public_post.reject",
    entityType: "PublicPost",
    entityId: post.publicPost.id,
    meta: { reason: v.data.reason },
  });
  updateTag(tags.publicPosts);
  refresh();
  return ok(undefined, "انرفضت المشاركة");
}
