import "server-only";
import { EnrollmentSource } from "@/generated/prisma/client";
import type { Tx } from "@/lib/db";

/**
 * Gives the buyer of a paid COURSE order access. Runs inside the payment
 * transaction and is idempotent per order (a repeated confirmation is a no-op).
 * Buying again after access ended reopens it; buying while active extends it.
 */
export async function grantCourseFromOrder(tx: Tx, order: { id: string; userId: string; courseId: string | null }) {
  if (!order.courseId) return;
  const already = await tx.courseEnrollment.findUnique({ where: { orderId: order.id } });
  if (already) return;

  const course = await tx.course.findUniqueOrThrow({ where: { id: order.courseId }, select: { accessDays: true } });
  const now = new Date();
  const current = await tx.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
  });
  const from = current?.endsAt && current.endsAt > now ? current.endsAt : now;
  const endsAt = course.accessDays ? new Date(from.getTime() + course.accessDays * 86_400_000) : null;

  await tx.courseEnrollment.upsert({
    where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
    create: { userId: order.userId, courseId: order.courseId, source: EnrollmentSource.PURCHASE, orderId: order.id, startsAt: now, endsAt },
    update: { source: EnrollmentSource.PURCHASE, orderId: order.id, startsAt: current && from > now ? current.startsAt : now, endsAt },
  });
}

/** Full refund: the course bought with this order closes now. */
export async function revokeCourseForOrder(tx: Tx, orderId: string) {
  const enrollment = await tx.courseEnrollment.findUnique({ where: { orderId } });
  if (!enrollment) return;
  const now = new Date();
  if (!enrollment.endsAt || enrollment.endsAt > now) {
    await tx.courseEnrollment.update({ where: { id: enrollment.id }, data: { endsAt: now } });
  }
}
