import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { getViewer, isStaff } from "@/lib/auth/dal";
import { isPremiumMember } from "@/features/premium/queries";
import { getEnrollment } from "./queries";
import type { ViewerFacts } from "./access";

/** Loads the facts `courseGate`/`lessonGate` need for the current request (deduplicated per request). */
export const getViewerFacts = cache(async (courseId: string) => {
  await connection();
  const viewer = await getViewer();
  if (!viewer) {
    const facts: ViewerFacts = { signedIn: false, isStaff: false, isPremium: false, enrollment: null, now: new Date() };
    return { viewer: null, facts };
  }
  const [isPremium, enrollment] = await Promise.all([isPremiumMember(viewer.id), getEnrollment(viewer.id, courseId)]);
  const facts: ViewerFacts = { signedIn: true, isStaff: isStaff(viewer), isPremium, enrollment, now: new Date() };
  return { viewer, facts };
});
