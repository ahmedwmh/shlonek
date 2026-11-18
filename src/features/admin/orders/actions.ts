"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  BookingStatus,
  OrderKind,
  OrderStatus,
  PurchaseStatus,
  RefundMethod,
  RefundStatus,
  WalletTxType,
} from "@/generated/prisma/client";
import { db, type Tx } from "@/lib/db";
import { audit } from "@/lib/audit";
import { features } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { formatIQD } from "@/lib/format";
import { fail, ok, toFailure, UserFacingError, type ActionResult } from "@/lib/action-result";
import { postWalletEntry } from "@/features/payments/wallet";
import { createWaylRefund } from "@/features/payments/wayl";
import { admin, parse, zId, zText } from "../shared/guard";

const LIVE = [BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

/**
 * Resolves a NEEDS_REVIEW order (money arrived late or for a stale attempt):
 * re-confirms its sessions if their slots are still free, grants premium if it
 * wasn't granted, and marks it PAID. Lost slots must be rescheduled first.
 */
export async function confirmOrderManually(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(z.object({ orderId: zId, note: zText(300, 3) }), input);
  if (!v.ok) return v.result;

  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${v.data.orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: v.data.orderId },
        include: { consultation: { include: { bookings: true } }, premiumPeriod: true },
      });
      if (!order) throw new UserFacingError("الطلب غير موجود.");
      if (order.status !== OrderStatus.NEEDS_REVIEW) throw new UserFacingError("هذا الطلب ما يحتاج مراجعة.");

      if (order.kind === OrderKind.CONSULTATION && order.consultation) {
        for (const b of order.consultation.bookings) {
          if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) continue;
          const taken = await tx.booking.findFirst({
            where: { id: { not: b.id }, coachId: b.coachId, startsAt: b.startsAt, status: { in: LIVE } },
          });
          if (taken) throw new UserFacingError(`موعد الجلسة ${b.sequence} انحجز لغيره. غيّر الموعد من صفحة الاستشارات أو استرد المبلغ.`);
          await tx.booking.update({ where: { id: b.id }, data: { status: BookingStatus.CONFIRMED, holdExpiresAt: null } });
        }
        await tx.consultationPurchase.update({ where: { id: order.consultation.id }, data: { status: PurchaseStatus.ACTIVE } });
      }

      if (order.kind === OrderKind.PREMIUM && !order.premiumPeriod && order.premiumPlanId) {
        const plan = await tx.premiumPlan.findUniqueOrThrow({ where: { id: order.premiumPlanId } });
        const now = new Date();
        const latest = await tx.premiumPeriod.findFirst({ where: { userId: order.userId, endsAt: { gt: now } }, orderBy: { endsAt: "desc" } });
        const startsAt = latest ? latest.endsAt : now;
        await tx.premiumPeriod.create({
          data: {
            userId: order.userId,
            planId: plan.id,
            orderId: order.id,
            startsAt,
            endsAt: new Date(startsAt.getTime() + plan.durationDays * 86_400_000),
            grantedBy: viewer.id,
          },
        });
      }

      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID, paidAt: order.paidAt ?? new Date() } });
      await audit({ actorId: viewer.id, action: "order.confirm_manual", entityType: "Order", entityId: order.id, meta: { note: v.data.note } }, tx);
    });
  } catch (error) {
    return toFailure(error);
  }
  refresh();
  return ok(undefined, "تأكد الطلب");
}

async function refundedSoFar(tx: Tx, orderId: string) {
  const agg = await tx.refund.aggregate({
    where: { orderId, status: { in: [RefundStatus.COMPLETED, RefundStatus.REQUESTED] } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** On a full refund, access bought with the order ends (future sessions cancelled, premium period ended). */
async function revokeAccess(tx: Tx, orderId: string) {
  const now = new Date();
  const purchase = await tx.consultationPurchase.findUnique({ where: { orderId } });
  if (purchase) {
    await tx.booking.updateMany({
      where: { purchaseId: purchase.id, status: { in: [BookingStatus.CONFIRMED, BookingStatus.HELD] }, startsAt: { gt: now } },
      data: { status: BookingStatus.CANCELLED },
    });
    await tx.consultationPurchase.update({ where: { id: purchase.id }, data: { status: PurchaseStatus.CANCELLED } });
  }
  const period = await tx.premiumPeriod.findUnique({ where: { orderId } });
  if (period && period.endsAt > now) {
    await tx.premiumPeriod.update({ where: { id: period.id }, data: { endsAt: period.startsAt > now ? period.startsAt : now } });
  }
}

const refundSchema = z.object({
  orderId: zId,
  amount: z.coerce.number({ error: "اكتب رقم" }).int("بدون كسور").min(250, "أقل مبلغ 250 د.ع"),
  reason: zText(1500, 5),
});

const REFUNDABLE: OrderStatus[] = [OrderStatus.PAID, OrderStatus.NEEDS_REVIEW, OrderStatus.PARTIALLY_REFUNDED];

/** Refund to the member's wallet (instant, ledger-backed). */
export async function refundToWallet(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(refundSchema, input);
  if (!v.ok) return v.result;
  const { orderId, amount, reason } = v.data;

  try {
    const email = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { user: { select: { email: true } } } });
      if (!order) throw new UserFacingError("الطلب غير موجود.");
      if (!REFUNDABLE.includes(order.status)) throw new UserFacingError("ما ينفع تسترد هذا الطلب بحالته الحالية.");
      const remaining = order.total - (await refundedSoFar(tx, orderId));
      if (amount > remaining) throw new UserFacingError(`أقصى مبلغ ممكن ${formatIQD(remaining)}.`);

      const refund = await tx.refund.create({
        data: { orderId, amount, method: RefundMethod.WALLET, status: RefundStatus.COMPLETED, reason, createdById: viewer.id },
      });
      await postWalletEntry(tx, {
        userId: order.userId,
        type: WalletTxType.REFUND,
        amount,
        orderId,
        actorId: viewer.id,
        note: `استرداد طلب #${order.number}`,
      });
      const full = amount === remaining;
      await tx.order.update({
        where: { id: orderId },
        data: { status: full ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED },
      });
      if (full) await revokeAccess(tx, orderId);
      await audit({ actorId: viewer.id, action: "refund.wallet", entityType: "Order", entityId: orderId, meta: { refundId: refund.id, amount, reason } }, tx);
      return order.user.email;
    });
    await sendEmail({
      to: email,
      subject: "رجعنالك مبلغ لمحفظتك",
      heading: "تم الاسترداد",
      body: `رجع ${formatIQD(amount)} لمحفظتك بشلونك.`,
      ctaLabel: "محفظتي",
      ctaPath: "/account/wallet",
    });
  } catch (error) {
    return toFailure(error);
  }
  refresh();
  return ok(undefined, "رجع المبلغ للمحفظة");
}

/** Requests a refund on Wayl for the gateway part of the payment. */
export async function requestGatewayRefund(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  if (!features.wayl) return fail("Wayl غير مفعّل. استرد للمحفظة بدلها.");
  const v = parse(refundSchema, input);
  if (!v.ok) return v.result;
  const { orderId, amount, reason } = v.data;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.waylReferenceId || order.gatewayAmount <= 0) return fail("هذا الطلب ما مدفوع عن طريق Wayl.");
  if (!REFUNDABLE.includes(order.status)) return fail("ما ينفع تسترد هذا الطلب بحالته الحالية.");
  if (amount < 1000) return fail("Wayl يقبل استرداد 1,000 د.ع أو أكثر.", { amount: ["الحد الأدنى 1,000 د.ع"] });
  const gatewayRefunded = (
    await db.refund.aggregate({
      where: { orderId, method: RefundMethod.GATEWAY, status: { in: [RefundStatus.COMPLETED, RefundStatus.REQUESTED] } },
      _sum: { amount: true },
    })
  )._sum.amount ?? 0;
  if (amount > order.gatewayAmount - gatewayRefunded) {
    return fail(`أقصى مبلغ عن طريق Wayl ${formatIQD(order.gatewayAmount - gatewayRefunded)}.`);
  }

  let externalId: string;
  try {
    externalId = (await createWaylRefund({ referenceId: order.waylReferenceId, amount, reason })).id;
  } catch {
    return fail("Wayl رفض طلب الاسترداد أو ما رد. حاول لاحقاً أو استرد للمحفظة.");
  }

  await db.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: { orderId, amount, method: RefundMethod.GATEWAY, status: RefundStatus.REQUESTED, reason, externalId, createdById: viewer.id },
    });
    await audit({ actorId: viewer.id, action: "refund.gateway.request", entityType: "Order", entityId: orderId, meta: { refundId: refund.id, amount, externalId } }, tx);
  });
  refresh();
  return ok(undefined, "انطلب الاسترداد من Wayl");
}

/** After Wayl processes it, staff mark the gateway refund completed. */
export async function completeGatewayRefund(refundId: string): Promise<ActionResult> {
  const viewer = await admin();
  try {
    await db.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId }, include: { order: true } });
      if (!refund || refund.status !== RefundStatus.REQUESTED) throw new UserFacingError("الطلب غير موجود أو مكتمل.");
      await tx.refund.update({ where: { id: refundId }, data: { status: RefundStatus.COMPLETED } });
      const total = await refundedSoFar(tx, refund.orderId);
      const full = total >= refund.order.total;
      await tx.order.update({ where: { id: refund.orderId }, data: { status: full ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED } });
      if (full) await revokeAccess(tx, refund.orderId);
      await audit({ actorId: viewer.id, action: "refund.gateway.complete", entityType: "Refund", entityId: refundId }, tx);
    });
  } catch (error) {
    return toFailure(error);
  }
  refresh();
  return ok(undefined, "تأكد الاسترداد");
}
