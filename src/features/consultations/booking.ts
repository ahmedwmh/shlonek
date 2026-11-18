import "server-only";
import { BookingStatus, ConsultationKind, OrderKind, OrderStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { UserFacingError } from "@/lib/action-result";
import { getSettings } from "@/features/settings/queries";
import { cancelOpenOrder } from "@/features/payments/orders";
import { getAvailableSlots } from "./availability";
import { getCoach } from "./queries";
import { isValidPackageSchedule } from "./package-weeks";

/** Moves holds whose time ran out to EXPIRED so the slots free up. */
export async function expireStaleHolds() {
  const { count } = await db.booking.updateMany({
    where: { status: BookingStatus.HELD, holdExpiresAt: { lt: new Date() } },
    data: { status: BookingStatus.EXPIRED },
  });
  return count;
}

/**
 * Locked order of the consultation flow: type → slot(s) → summary → pay.
 * Creates the order + purchase + HELD bookings in one transaction. The partial
 * unique index on (coachId, startsAt) makes double booking impossible even when
 * two members submit the same slot at the same moment.
 */
export async function createConsultationOrder(input: { userId: string; serviceId: string; starts: string[] }) {
  const service = await db.consultationService.findFirst({ where: { id: input.serviceId, isActive: true } });
  if (!service) throw new UserFacingError("هذي الخدمة غير متاحة حالياً.");

  const coach = await getCoach();
  if (!coach) throw new UserFacingError("الحجز غير متاح حالياً.");

  const starts = [...new Set(input.starts)].map((s) => new Date(s)).sort((a, b) => a.getTime() - b.getTime());
  if (starts.length !== service.sessionsCount || starts.some((d) => Number.isNaN(d.getTime()))) {
    throw new UserFacingError(`اختار ${service.sessionsCount === 1 ? "موعد واحد" : `${service.sessionsCount} مواعيد`}.`);
  }
  if (service.kind === ConsultationKind.PACKAGE && !isValidPackageSchedule(starts.map((d) => d.getTime()), service.sessionsCount)) {
    throw new UserFacingError("لازم تكون جلسة وحدة بكل أسبوع من أسابيع الباقة.");
  }

  // One open consultation order at a time: starting over releases the previous holds.
  const open = await db.order.findMany({
    where: { userId: input.userId, kind: OrderKind.CONSULTATION, status: OrderStatus.AWAITING_PAYMENT },
    select: { id: true },
  });
  for (const o of open) await cancelOpenOrder(o.id, input.userId);
  await expireStaleHolds();

  const available = new Set(
    (await getAvailableSlots({ coachId: coach.id, durationMinutes: service.durationMinutes })).map((s) => s.startsAt),
  );
  if (starts.some((d) => !available.has(d.toISOString()))) {
    throw new UserFacingError("أحد المواعيد ما عاد متاح. اختار موعد ثاني.");
  }

  const { holdMinutes } = await getSettings("booking");
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60_000);

  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: input.userId,
          kind: OrderKind.CONSULTATION,
          title: service.title,
          subtotal: service.price,
          total: service.price,
          expiresAt: holdExpiresAt,
        },
      });
      await tx.consultationPurchase.create({
        data: {
          userId: input.userId,
          serviceId: service.id,
          orderId: order.id,
          sessionsCount: service.sessionsCount,
          bookings: {
            create: starts.map((startsAt, i) => ({
              userId: input.userId,
              coachId: coach.id,
              sequence: i + 1,
              startsAt,
              endsAt: new Date(startsAt.getTime() + service.durationMinutes * 60_000),
              status: BookingStatus.HELD,
              holdExpiresAt,
            })),
          },
        },
      });
      return order;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new UserFacingError("هذا الموعد انحجز قبل شوية من شخص ثاني. اختار موعد ثاني.");
    }
    throw error;
  }
}
