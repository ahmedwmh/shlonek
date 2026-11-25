"use server";

import { after } from "next/server";
import { z } from "zod";
import { ContentStatus, EnrollmentSource, OrderKind, OrderStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/dal";
import { fail, ok, toFailure, type ActionResult } from "@/lib/action-result";
import { features } from "@/lib/env";
import { expireStaleOrders } from "@/features/payments/orders";
import { isPremiumMember } from "@/features/premium/queries";
import { lessonGate, ownsCourse, priceFor, type Gate } from "./access";
import { normalizeListing } from "./listing";
import { getCoursePage, type CoursePage } from "./queries";
import { getVdoCipherPlayback } from "./vdocipher";
import { getViewerFacts } from "./viewer";

const idSchema = z.string().min(1).max(40);

async function loadPublished(courseId: string) {
  if (!idSchema.safeParse(courseId).success) return null;
  return db.course.findFirst({
    where: { id: courseId, status: ContentStatus.PUBLISHED },
    select: { id: true, slug: true, kind: true, access: true, title: true, price: true, premiumPrice: true },
  });
}

/**
 * Adds a free course or workshop to «كورساتي». Joining never creates a payment;
 * for premium workshops it only records interest — playback re-checks premium.
 */
export async function joinCourse(courseId: string): Promise<ActionResult<{ slug: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك أول.");
  const course = await loadPublished(courseId);
  if (!course) return fail("هذا المحتوى غير متاح.");
  if (course.access === "PAID") return fail("هذا الكورس مدفوع.");
  if (course.access === "PREMIUM" && !(await isPremiumMember(viewer.id))) {
    return fail("هذي الورشة لمشتركي بريميوم.");
  }
  await db.courseEnrollment.upsert({
    where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
    create: { userId: viewer.id, courseId: course.id, source: EnrollmentSource.JOIN },
    update: {},
  });
  return ok({ slug: course.slug });
}

/**
 * Creates (or reuses) an unpaid order for a paid course. The price is computed
 * here from the member's premium status at this moment and frozen in the order.
 */
export async function createCourseOrder(courseId: string): Promise<ActionResult<{ orderId: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("سجّل دخولك أول.");
  const course = await loadPublished(courseId);
  if (!course || course.access !== "PAID") return fail("هذا الكورس غير متاح للشراء.");

  try {
    const now = new Date();
    const enrollment = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
      select: { source: true, endsAt: true },
    });
    if (ownsCourse({ signedIn: true, isStaff: false, isPremium: false, enrollment, now })) {
      return fail("الكورس موجود بكورساتك.");
    }

    await expireStaleOrders({ userId: viewer.id });
    const price = priceFor(course, await isPremiumMember(viewer.id));
    if (!price) return fail("سعر هذا الكورس غير محدد بعد.");

    // Double clicks / coming back reuse the open order — unless the price changed
    // (premium started or ended, or staff edited the price): then start fresh.
    const open = await db.order.findFirst({
      where: { userId: viewer.id, kind: OrderKind.COURSE, courseId: course.id, status: OrderStatus.AWAITING_PAYMENT, expiresAt: { gt: now } },
      select: { id: true, total: true },
    });
    if (open && open.total === price.final) return ok({ orderId: open.id });
    if (open) await db.order.update({ where: { id: open.id }, data: { status: OrderStatus.CANCELLED } });

    const order = await db.order.create({
      data: {
        userId: viewer.id,
        kind: OrderKind.COURSE,
        title: `${course.kind === "WORKSHOP" ? "ورشة" : "كورس"} — ${course.title}`,
        subtotal: price.original,
        discount: price.discount,
        total: price.final,
        courseId: course.id,
        expiresAt: new Date(now.getTime() + 60 * 60_000),
      },
    });
    return ok({ orderId: order.id });
  } catch (error) {
    return toFailure(error);
  }
}

export type Playback =
  | { provider: "YOUTUBE"; videoId: string }
  | { provider: "VDOCIPHER"; otp: string; playbackInfo: string };

/**
 * Called when someone presses play. Re-checks access on the server every time,
 * and only then returns the YouTube id or a fresh, short-lived VdoCipher OTP —
 * so no page HTML ever carries a playable video reference.
 * Playing free content also adds it to «كورساتي».
 */
export async function startPlayback(
  courseId: string,
  lessonId: string,
): Promise<ActionResult<Playback> | { ok: false; error: string; gate: Gate }> {
  if (!idSchema.safeParse(courseId).success || !idSchema.safeParse(lessonId).success) return fail("طلب غير صحيح.");
  const [course, lesson] = await Promise.all([
    db.course.findFirst({
      where: { id: courseId, status: { in: [ContentStatus.PUBLISHED, ContentStatus.ARCHIVED] } },
      select: { id: true, access: true, price: true, premiumPrice: true, status: true },
    }),
    db.courseLesson.findFirst({ where: { id: lessonId, courseId }, select: { isPreview: true, provider: true, videoId: true } }),
  ]);
  if (!course || !lesson) return fail("الفيديو غير موجود.");

  const { viewer, facts } = await getViewerFacts(course.id);
  const gate = lessonGate(course, lesson, facts);
  if (gate !== "ok") return { ok: false, error: "هذا الفيديو مقفل.", gate };

  if (viewer && course.access !== "PAID" && course.status === ContentStatus.PUBLISHED && !facts.enrollment) {
    after(() =>
      db.courseEnrollment
        .upsert({
          where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
          create: { userId: viewer.id, courseId: course.id, source: EnrollmentSource.JOIN },
          update: {},
        })
        .catch(() => undefined),
    );
  }

  if (lesson.provider === "YOUTUBE") return ok({ provider: "YOUTUBE", videoId: lesson.videoId });
  if (!features.vdocipher) return fail("هذا الفيديو قيد التجهيز وراح يكون متاح قريباً.");
  const playback = await getVdoCipherPlayback({ videoId: lesson.videoId, viewer: viewer ? { id: viewer.id, email: viewer.email } : null });
  return playback ? ok({ provider: "VDOCIPHER", ...playback }) : fail("الفيديو غير متاح حالياً، جرّب بعد شوية.");
}

/** Next page of the courses grid, for scroll pagination (public, read-only, cached). */
export async function loadCourses(tab: string, filter: string, offset: number): Promise<CoursePage> {
  const view = normalizeListing(tab, filter, { courses: 1, workshops: 1 });
  const safeOffset = Number.isInteger(offset) && offset >= 0 && offset <= 5_000 ? offset : 0;
  return getCoursePage(view.tab, view.filter, safeOffset);
}
