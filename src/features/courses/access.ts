import type { CourseAccess, CourseEnrollment } from "@/generated/prisma/client";

/**
 * The single source of truth for who may watch what (requirements §02, §04).
 * Pure functions: callers pass in the facts they loaded on the server.
 *
 *  - Paid course: its one intro video is public; the rest need a valid purchase.
 *    Premium only lowers the price, it never unlocks a paid course.
 *  - Free course / public workshop: any signed-in member.
 *  - Premium workshop: only while premium is active.
 *  - Staff can watch everything (to check their own content).
 */

export type ViewerFacts = {
  signedIn: boolean;
  isStaff: boolean;
  isPremium: boolean;
  enrollment: Pick<CourseEnrollment, "source" | "endsAt"> | null;
  now: Date;
};

export type CourseFacts = {
  access: CourseAccess;
  price: number | null;
  premiumPrice: number | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

/** "ok", or what the viewer needs first. "closed": archived, open only to past members. */
export type Gate = "ok" | "login" | "buy" | "premium" | "closed";

export function ownsCourse(v: ViewerFacts) {
  return Boolean(v.enrollment && (!v.enrollment.endsAt || v.enrollment.endsAt > v.now));
}

/** A purchase/grant whose access window has ended. */
export function ownershipExpired(v: ViewerFacts) {
  return Boolean(v.enrollment?.endsAt && v.enrollment.endsAt <= v.now);
}

export function courseGate(course: CourseFacts, v: ViewerFacts): Gate {
  if (v.isStaff) return "ok";
  if (!v.signedIn) return "login";
  if (course.status === "ARCHIVED" && !v.enrollment) return "closed";
  if (course.access === "FREE") return "ok";
  if (course.access === "PREMIUM") return v.isPremium ? "ok" : "premium";
  return ownsCourse(v) ? "ok" : "buy";
}

export function lessonGate(course: CourseFacts, lesson: { isPreview: boolean }, v: ViewerFacts): Gate {
  if (course.access === "PAID" && lesson.isPreview && course.status !== "ARCHIVED") return "ok";
  return courseGate(course, v);
}

/** What this viewer pays for a paid course right now (server recomputes at checkout). */
export function priceFor(course: CourseFacts, isPremium: boolean) {
  if (course.access !== "PAID" || course.price === null) return null;
  const discounted = isPremium && course.premiumPrice !== null && course.premiumPrice < course.price;
  return {
    original: course.price,
    final: discounted ? course.premiumPrice! : course.price,
    discount: discounted ? course.price - course.premiumPrice! : 0,
  };
}
