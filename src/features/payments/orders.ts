import "server-only";
import { after } from "next/server";
import { BookingStatus, OrderKind, OrderStatus, PurchaseStatus, WalletTxType } from "@/generated/prisma/client";
import { db, type Tx } from "@/lib/db";
import { env, features } from "@/lib/env";
import { UserFacingError } from "@/lib/action-result";
import { sendEmail } from "@/lib/email";
import { formatDateTime, formatIQD } from "@/lib/format";
import { getSettings } from "@/features/settings/queries";
import { holdWalletAmount, lockWallet, postWalletEntry, releaseWalletHold, spendable } from "./wallet";
import { splitPayment } from "./split";
import {
  WAYL_FAILED_STATUSES,
  WAYL_PAID_STATUSES,
  createWaylLink,
  getWaylLink,
  invalidateWaylLinkIfPending,
} from "./wayl";

/**
 * Order lifecycle (one place for every product):
 *   AWAITING_PAYMENT ──wallet──────────────► PAID
 *          │
 *          └─gateway link─► VERIFYING ─webhook/lookup─► PAID | NEEDS_REVIEW (late, slot lost)
 *                               │
 *                               └─failed/expired─► AWAITING_PAYMENT (retry) | EXPIRED
 * Fulfilment (bookings, premium) happens in the same transaction that marks it paid,
 * and is idempotent: a second confirmation for a PAID order is a no-op.
 */

const OPEN_STATUSES: OrderStatus[] = [OrderStatus.AWAITING_PAYMENT, OrderStatus.VERIFYING];

export const isWaylActive = async () => features.wayl && (await getSettings("payments")).waylEnabled;

export async function getOrderForUser(orderId: string, userId: string) {
  return db.order.findFirst({
    where: { id: orderId, userId },
    include: {
      consultation: {
        include: {
          service: { select: { title: true, durationMinutes: true, deliveryMethod: true } },
          bookings: { orderBy: { sequence: "asc" }, select: { id: true, startsAt: true, endsAt: true, status: true, sequence: true } },
        },
      },
      premiumPlan: { select: { name: true, durationDays: true } },
      premiumPeriod: { select: { startsAt: true, endsAt: true } },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Paying
// ─────────────────────────────────────────────────────────────

async function lockOpenOrder(tx: Tx, orderId: string, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  const order = await tx.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new UserFacingError("الطلب غير موجود.");
  if (order.status === OrderStatus.PAID) throw new UserFacingError("هذا الطلب مدفوع من قبل.");
  if (!OPEN_STATUSES.includes(order.status)) throw new UserFacingError("هذا الطلب ما عاد متاح، ابدأ طلب جديد.");
  if (order.expiresAt && order.expiresAt < new Date()) throw new UserFacingError("انتهت مهلة الحجز المؤقت. اختار موعد جديد.");
  return order;
}

/** Pays the whole order from the wallet, atomically. */
export async function payOrderWithWallet(orderId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const order = await lockOpenOrder(tx, orderId, userId);
    if (order.status === OrderStatus.VERIFYING) throw new UserFacingError("عندك دفع قيد التحقق لهذا الطلب.");
    const wallet = await lockWallet(tx, userId);
    if (spendable(wallet) < order.total) throw new UserFacingError("رصيد المحفظة ما يكفي.");

    await postWalletEntry(tx, {
      userId,
      type: WalletTxType.PURCHASE,
      amount: -order.total,
      orderId: order.id,
      note: order.title,
    });
    await tx.order.update({
      where: { id: order.id },
      data: { walletAmount: order.total, gatewayAmount: 0, walletHeld: false },
    });
    return fulfilOrder(tx, order.id, { source: "wallet" });
  });
}

/**
 * Starts a Wayl payment. If `useWallet`, the wallet covers part and is reserved
 * (not spent) until Wayl confirms. Returns the checkout URL to redirect to.
 */
export async function startGatewayPayment(orderId: string, userId: string, useWallet: boolean) {
  if (!(await isWaylActive())) throw new UserFacingError("الدفع الإلكتروني غير متاح حالياً، استخدم المحفظة.");

  const prepared = await db.$transaction(async (tx) => {
    const order = await lockOpenOrder(tx, orderId, userId);
    // A previous attempt still open: release its hold before starting a new one.
    if (order.walletHeld && order.walletAmount > 0) await releaseWalletHold(tx, userId, order.walletAmount);

    const wallet = await lockWallet(tx, userId);
    const split = splitPayment(order.total, spendable(wallet), useWallet);
    if (split.gatewayAmount === 0) throw new UserFacingError("رصيدك يكفي، ادفع من المحفظة مباشرة.");
    await holdWalletAmount(tx, userId, split.walletAmount);

    const referenceId = `${order.id}_${Date.now().toString(36)}`;
    await tx.order.update({
      where: { id: order.id },
      data: {
        ...split,
        walletHeld: split.walletAmount > 0,
        waylReferenceId: referenceId,
        status: OrderStatus.VERIFYING,
      },
    });
    return { order, referenceId, gatewayAmount: split.gatewayAmount };
  });

  const minutesLeft = prepared.order.expiresAt
    ? Math.max(1, Math.floor((prepared.order.expiresAt.getTime() - Date.now()) / 60_000))
    : 60;

  try {
    const link = await createWaylLink({
      referenceId: prepared.referenceId,
      total: prepared.gatewayAmount,
      label: prepared.order.title,
      redirectionUrl: `${env.NEXT_PUBLIC_SITE_URL}/checkout/${prepared.order.id}/result`,
      webhookUrl: `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/wayl`,
      expiresInMinutes: minutesLeft,
    });
    await db.order.update({
      where: { id: prepared.order.id },
      data: { waylLinkId: link.id ?? null, waylUrl: link.url ?? null, waylStatus: link.status },
    });
    if (!link.url) throw new Error("Wayl returned no URL");
    return link.url;
  } catch (error) {
    await abandonGatewayAttempt(prepared.order.id, OrderStatus.AWAITING_PAYMENT);
    console.error(error);
    throw new UserFacingError("ما گدرنا نفتح صفحة الدفع، جرّب بعد شوية.");
  }
}

/** Releases the wallet hold of a failed/cancelled gateway attempt. */
async function abandonGatewayAttempt(orderId: string, nextStatus: OrderStatus) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || !OPEN_STATUSES.includes(order.status)) return;
    if (order.walletHeld) await releaseWalletHold(tx, order.userId, order.walletAmount);
    const expired = nextStatus === OrderStatus.EXPIRED || (order.expiresAt && order.expiresAt < new Date());
    await tx.order.update({
      where: { id: orderId },
      data: { walletHeld: false, status: expired ? OrderStatus.EXPIRED : nextStatus },
    });
    if (expired) await expireOrderBookings(tx, orderId);
  });
}

async function expireOrderBookings(tx: Tx, orderId: string) {
  const purchase = await tx.consultationPurchase.findUnique({ where: { orderId }, select: { id: true } });
  if (!purchase) return;
  await tx.booking.updateMany({
    where: { purchaseId: purchase.id, status: BookingStatus.HELD },
    data: { status: BookingStatus.EXPIRED },
  });
  await tx.consultationPurchase.update({ where: { id: purchase.id }, data: { status: PurchaseStatus.CANCELLED } });
}

// ─────────────────────────────────────────────────────────────
// Confirmation (webhook or server-side lookup) and fulfilment
// ─────────────────────────────────────────────────────────────

/**
 * Applies a gateway status for a referenceId. Safe to call many times:
 * duplicate "paid" notifications activate the order only once.
 */
export async function applyGatewayStatus(referenceId: string, status: string, paidTotal?: string | number) {
  const order = await db.order.findUnique({ where: { waylReferenceId: referenceId } });
  if (!order) return { handled: false as const };

  if (WAYL_PAID_STATUSES.has(status)) {
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
      const fresh = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      if (fresh.status === OrderStatus.PAID || fresh.status === OrderStatus.NEEDS_REVIEW) return fresh.status;
      // Money arrived for a stale attempt (a newer referenceId exists): keep it for review.
      if (fresh.waylReferenceId !== referenceId) {
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.NEEDS_REVIEW, waylStatus: status } });
        return OrderStatus.NEEDS_REVIEW;
      }
      // Defence in depth: the amount Wayl collected must be the amount we asked for.
      // Anything else goes to staff review; the reserved wallet part stays reserved.
      if (paidTotal !== undefined && Number(paidTotal) !== fresh.gatewayAmount) {
        console.error("[wayl] amount mismatch", { orderId: fresh.id, expected: fresh.gatewayAmount, paidTotal });
        await tx.order.update({ where: { id: fresh.id }, data: { status: OrderStatus.NEEDS_REVIEW, waylStatus: status } });
        return OrderStatus.NEEDS_REVIEW;
      }
      if (fresh.walletHeld && fresh.walletAmount > 0) {
        await postWalletEntry(tx, {
          userId: fresh.userId,
          type: WalletTxType.PURCHASE,
          amount: -fresh.walletAmount,
          releaseHeld: fresh.walletAmount,
          orderId: fresh.id,
          note: `${fresh.title} (جزء من المحفظة)`,
        });
      }
      await tx.order.update({ where: { id: fresh.id }, data: { walletHeld: false, waylStatus: status } });
      return fulfilOrder(tx, fresh.id, { source: "gateway" });
    });
    return { handled: true as const, status: result };
  }

  if (WAYL_FAILED_STATUSES.has(status) && order.waylReferenceId === referenceId) {
    await db.order.update({ where: { id: order.id }, data: { waylStatus: status } });
    await abandonGatewayAttempt(order.id, OrderStatus.AWAITING_PAYMENT);
  }
  return { handled: true as const, status: order.status };
}

/** Asks Wayl directly (server-to-server) — used when the member returns from checkout. */
export async function refreshGatewayStatus(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.waylReferenceId || order.status !== OrderStatus.VERIFYING || !features.wayl) return;
  try {
    const link = await getWaylLink(order.waylReferenceId);
    await applyGatewayStatus(order.waylReferenceId, link.status, link.total);
  } catch (error) {
    console.error("[wayl] status lookup failed", error);
  }
}

/** Marks the order paid and grants what was bought. Runs inside the payment transaction. */
async function fulfilOrder(tx: Tx, orderId: string, meta: { source: "wallet" | "gateway" }) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  const now = new Date();
  let status: OrderStatus = OrderStatus.PAID;

  if (order.kind === OrderKind.CONSULTATION) {
    const purchase = await tx.consultationPurchase.findUniqueOrThrow({
      where: { orderId },
      include: { bookings: true },
    });
    for (const booking of purchase.bookings) {
      if (booking.status === BookingStatus.HELD) {
        await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CONFIRMED, holdExpiresAt: null } });
        continue;
      }
      // Hold expired before the money arrived: re-confirm only if nobody took the slot.
      const taken = await tx.booking.findFirst({
        where: {
          coachId: booking.coachId,
          startsAt: booking.startsAt,
          id: { not: booking.id },
          status: { in: [BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      });
      if (taken) status = OrderStatus.NEEDS_REVIEW;
      else
        await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CONFIRMED, holdExpiresAt: null } });
    }
    await tx.consultationPurchase.update({ where: { id: purchase.id }, data: { status: PurchaseStatus.ACTIVE } });
  }

  if (order.kind === OrderKind.PREMIUM && order.premiumPlanId) {
    const plan = await tx.premiumPlan.findUniqueOrThrow({ where: { id: order.premiumPlanId } });
    const latest = await tx.premiumPeriod.findFirst({
      where: { userId: order.userId, endsAt: { gt: now } },
      orderBy: { endsAt: "desc" },
    });
    // Buying again while active extends from the current end — no lost days.
    const startsAt = latest ? latest.endsAt : now;
    await tx.premiumPeriod.create({
      data: {
        userId: order.userId,
        planId: plan.id,
        orderId: order.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + plan.durationDays * 86_400_000),
      },
    });
  }

  await tx.order.update({ where: { id: orderId }, data: { status, paidAt: now } });
  notifyPaid(orderId, meta.source);
  return status;
}

function notifyPaid(orderId: string, source: "wallet" | "gateway") {
  // Sent after the response (and after the transaction commits); never affects the payment.
  after(async () => {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true } }, consultation: { include: { bookings: { orderBy: { sequence: "asc" } } } } },
    });
    if (!order || order.status !== OrderStatus.PAID) return;
    const sessions = order.consultation?.bookings.map((b) => formatDateTime(b.startsAt)).join("، ");
    await sendEmail({
      to: order.user.email,
      subject: `تأكيد طلبك #${order.number}`,
      heading: "تم الدفع بنجاح",
      body: `${order.title} — ${formatIQD(order.total)}${source === "wallet" ? " (من المحفظة)" : ""}.${sessions ? ` المواعيد: ${sessions}.` : ""}`,
      ctaLabel: "افتح حسابي",
      ctaPath: "/account",
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Housekeeping (cron + lazily on reads)
// ─────────────────────────────────────────────────────────────

/** Expires unpaid orders past their hold, checking Wayl first so a late payment isn't lost. */
/**
 * Expires unpaid orders past their hold (releasing reserved wallet money and held
 * slots), checking Wayl first so a late payment isn't lost. Runs for one member on
 * the spot when they act, and for everyone in the daily cron sweep.
 */
export async function expireStaleOrders({ userId }: { userId?: string } = {}) {
  const stale = await db.order.findMany({
    where: { status: { in: OPEN_STATUSES }, expiresAt: { lt: new Date() }, ...(userId ? { userId } : {}) },
    take: 50,
  });
  for (const order of stale) {
    if (order.status === OrderStatus.VERIFYING && order.waylReferenceId) {
      await refreshGatewayStatus(order.id);
      const fresh = await db.order.findUnique({ where: { id: order.id } });
      if (fresh?.status !== OrderStatus.VERIFYING) continue;
      await invalidateWaylLinkIfPending(order.waylReferenceId);
    }
    await abandonGatewayAttempt(order.id, OrderStatus.EXPIRED);
  }
  return stale.length;
}

/** Member cancels an unpaid order (e.g. picked the wrong time). */
export async function cancelOpenOrder(orderId: string, userId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId, status: { in: OPEN_STATUSES } } });
  if (!order) return;
  if (order.waylReferenceId) await invalidateWaylLinkIfPending(order.waylReferenceId);
  await db.$transaction(async (tx) => {
    if (order.walletHeld) await releaseWalletHold(tx, userId, order.walletAmount);
    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED, walletHeld: false } });
    await expireOrderBookings(tx, order.id);
  });
}
