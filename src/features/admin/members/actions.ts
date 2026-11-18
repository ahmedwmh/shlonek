"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { Role, WalletTxType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { formatIQD } from "@/lib/format";
import { fail, ok, toFailure, type ActionResult } from "@/lib/action-result";
import { cleanText } from "@/features/posts/sanitize";
import { postWalletEntry } from "@/features/payments/wallet";
import { admin, parse, staff, zId, zText } from "../shared/guard";

const topUpSchema = z.object({
  userId: zId,
  amount: z.coerce.number({ error: "اكتب رقم" }).int("بدون كسور").min(250, "أقل مبلغ 250 د.ع").max(10_000_000, "مبلغ كبير جداً"),
  note: zText(300, 2),
});

/** Owner credits a member's wallet after being paid outside the site. */
export async function topUpWallet(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(topUpSchema, input);
  if (!v.ok) return v.result;
  const { userId, amount, note } = v.data;

  try {
    const user = await db.$transaction(async (tx) => {
      const member = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!member) return null;
      await postWalletEntry(tx, { userId, type: WalletTxType.TOPUP, amount, actorId: viewer.id, note });
      await audit({ actorId: viewer.id, action: "wallet.topup", entityType: "User", entityId: userId, meta: { amount, note } }, tx);
      return member;
    });
    if (!user) return fail("العضو غير موجود.");
    await sendEmail({
      to: user.email,
      subject: "انضاف رصيد لمحفظتك",
      heading: "انشحنت محفظتك",
      body: `انضاف ${formatIQD(amount)} لمحفظتك بشلونك. تگدر تستخدمه للاشتراك أو حجز الاستشارات.`,
      ctaLabel: "افتح محفظتي",
      ctaPath: "/account/wallet",
    });
  } catch (error) {
    return toFailure(error);
  }
  refresh();
  return ok(undefined, `انضاف ${formatIQD(amount)} للمحفظة`);
}

const adjustSchema = z.object({
  userId: zId,
  amount: z.coerce
    .number({ error: "اكتب رقم" })
    .int("بدون كسور")
    .refine((n) => n !== 0, "المبلغ ما يصير صفر")
    .refine((n) => Math.abs(n) <= 10_000_000, "مبلغ كبير جداً"),
  note: zText(300, 3),
});

/** Corrections (+/-). The wallet can never go below zero or below its reserved amount. */
export async function adjustWallet(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(adjustSchema, input);
  if (!v.ok) return v.result;
  const { userId, amount, note } = v.data;
  try {
    await db.$transaction(async (tx) => {
      await postWalletEntry(tx, { userId, type: WalletTxType.ADJUSTMENT, amount, actorId: viewer.id, note });
      await audit({ actorId: viewer.id, action: "wallet.adjust", entityType: "User", entityId: userId, meta: { amount, note } }, tx);
    });
  } catch (error) {
    return toFailure(error);
  }
  refresh();
  return ok(undefined, "تم تعديل الرصيد");
}

const DAY = 86_400_000;

const grantSchema = z.object({
  userId: zId,
  /** Preset ("7", "30", "90") or "custom" with `customDays`. */
  duration: z.enum(["7", "30", "90", "custom"], { error: "اختار المدة" }),
  customDays: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number({ error: "اكتب رقم" }).int("بدون كسور").min(1, "يوم واحد على الأقل").max(366, "أقصى مدة سنة").optional(),
  ),
  note: zText(300, 2),
});

/**
 * Manual premium activation (e.g. paid in cash): a week, a month, 3 months or any
 * number of days. If the member is already covered, the new period starts when the
 * current one ends — no days are lost. Audited, and the member gets an email.
 */
export async function grantPremium(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(grantSchema, input);
  if (!v.ok) return v.result;
  const { userId, duration, customDays, note } = v.data;
  const days = duration === "custom" ? customDays : Number(duration);
  if (!days) return fail("اكتب عدد الأيام.", { customDays: ["اكتب عدد الأيام"] });

  try {
    const result = await db.$transaction(async (tx) => {
      const member = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!member) return null;
      const now = new Date();
      const latest = await tx.premiumPeriod.findFirst({ where: { userId, endsAt: { gt: now } }, orderBy: { endsAt: "desc" } });
      const startsAt = latest ? latest.endsAt : now;
      const period = await tx.premiumPeriod.create({
        data: { userId, startsAt, endsAt: new Date(startsAt.getTime() + days * DAY), grantedBy: viewer.id, note },
      });
      await audit(
        { actorId: viewer.id, action: "premium.grant", entityType: "PremiumPeriod", entityId: period.id, meta: { userId, days, note } },
        tx,
      );
      return { email: member.email, endsAt: period.endsAt };
    });
    if (!result) return fail("العضو غير موجود.");
    await sendEmail({
      to: result.email,
      subject: "تفعّل اشتراكك ببريميوم",
      heading: "هلا بيك ببريميوم",
      body: `تفعّل اشتراكك لمدة ${days} يوم. كل التمارين اللي عليها التاج صارت مفتوحة إلك.`,
      ctaLabel: "افتح اشتراكي",
      ctaPath: "/account/subscription",
    });
  } catch (error) {
    return toFailure(error);
  }
  refresh();
  return ok(undefined, `تفعّل بريميوم لمدة ${days} يوم`);
}

/**
 * Ends a premium period now (or cancels it if it hasn't started). Later periods
 * shift back so the member's coverage stays continuous without a gap.
 */
export async function endPremiumPeriod(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(z.object({ periodId: zId, note: zText(300, 2) }), input);
  if (!v.ok) return v.result;
  const { periodId, note } = v.data;

  try {
    const done = await db.$transaction(async (tx) => {
      const period = await tx.premiumPeriod.findUnique({ where: { id: periodId } });
      const now = new Date();
      if (!period || period.endsAt <= now) return false;

      const newEnd = period.startsAt > now ? period.startsAt : now;
      const removed = period.endsAt.getTime() - newEnd.getTime();
      await tx.premiumPeriod.update({ where: { id: period.id }, data: { endsAt: newEnd, endedEarlyAt: now, note } });

      // Pull the following (queued) periods earlier by the removed time.
      const later = await tx.premiumPeriod.findMany({
        where: { userId: period.userId, startsAt: { gte: period.endsAt }, id: { not: period.id } },
        orderBy: { startsAt: "asc" },
      });
      for (const p of later) {
        await tx.premiumPeriod.update({
          where: { id: p.id },
          data: { startsAt: new Date(p.startsAt.getTime() - removed), endsAt: new Date(p.endsAt.getTime() - removed) },
        });
      }
      await audit(
        { actorId: viewer.id, action: "premium.end", entityType: "PremiumPeriod", entityId: period.id, meta: { note, removedDays: Math.round(removed / DAY) } },
        tx,
      );
      return true;
    });
    if (!done) return fail("هذي المدة منتهية من قبل.");
  } catch (error) {
    return toFailure(error);
  }
  refresh();
  return ok(undefined, "انتهت المدة");
}

export async function setMemberRole(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(z.object({ userId: zId, role: z.enum(Role) }), input);
  if (!v.ok) return v.result;
  const { userId, role } = v.data;

  if (userId === viewer.id && role !== Role.ADMIN) {
    const admins = await db.user.count({ where: { role: Role.ADMIN } });
    if (admins <= 1) return fail("لازم يبقى مدير واحد على الأقل.");
  }
  const before = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!before) return fail("العضو غير موجود.");

  await db.user.update({ where: { id: userId }, data: { role } });
  await audit({ actorId: viewer.id, action: "user.role", entityType: "User", entityId: userId, meta: { from: before.role, to: role } });
  refresh();
  return ok(undefined, "تغيّرت الصلاحية");
}

export async function addMemberNote(input: { userId: string; body: string }): Promise<ActionResult> {
  const viewer = await staff();
  const v = parse(z.object({ userId: zId, body: zText(2000, 2) }), input);
  if (!v.ok) return v.result;
  await db.staffNote.create({ data: { subjectId: v.data.userId, authorId: viewer.id, body: cleanText(v.data.body) } });
  refresh();
  return ok(undefined, "انحفظت الملاحظة");
}
