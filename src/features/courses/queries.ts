import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { ContentStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { accessFor, COURSE_PAGE_SIZE, type CourseFilter, type CourseTab } from "./listing";

/**
 * Public course data is cached and NEVER includes video ids: those are read
 * only by `getLessonForPlayback`, after the access check.
 */
const cardSelect = {
  id: true,
  slug: true,
  kind: true,
  access: true,
  title: true,
  summary: true,
  presenter: true,
  price: true,
  premiumPrice: true,
  accessDays: true,
  coverVersion: true,
  _count: { select: { lessons: true } },
} as const;

export async function getPublishedCourses() {
  "use cache";
  cacheTag(tags.courses);
  cacheLife("hours");
  return db.course.findMany({
    where: { status: ContentStatus.PUBLISHED },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    select: cardSelect,
  });
}
export type CourseCardData = Awaited<ReturnType<typeof getPublishedCourses>>[number];

/** One page of the courses grid (offset pagination over a cached, stable order). */
export async function getCoursePage(tab: CourseTab, filter: CourseFilter, offset: number) {
  "use cache";
  cacheTag(tags.courses);
  cacheLife("hours");
  const access = accessFor(filter);
  const rows = await db.course.findMany({
    where: { status: ContentStatus.PUBLISHED, kind: tab === "workshops" ? "WORKSHOP" : "COURSE", ...(access ? { access } : {}) },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }],
    skip: offset,
    take: COURSE_PAGE_SIZE + 1,
    select: cardSelect,
  });
  return { items: rows.slice(0, COURSE_PAGE_SIZE), hasMore: rows.length > COURSE_PAGE_SIZE };
}
export type CoursePage = Awaited<ReturnType<typeof getCoursePage>>;

export async function getCourseCounts() {
  "use cache";
  cacheTag(tags.courses);
  cacheLife("hours");
  const groups = await db.course.groupBy({ by: ["kind"], where: { status: ContentStatus.PUBLISHED }, _count: { _all: true } });
  const of = (kind: "COURSE" | "WORKSHOP") => groups.find((g) => g.kind === kind)?._count._all ?? 0;
  return { courses: of("COURSE"), workshops: of("WORKSHOP") };
}

export async function getCourseBySlug(slug: string) {
  "use cache";
  cacheTag(tags.courses, tags.course(slug));
  cacheLife("hours");
  // Archived content stays reachable for people who already own or joined it.
  return db.course.findFirst({
    where: { slug, status: { in: [ContentStatus.PUBLISHED, ContentStatus.ARCHIVED] } },
    select: {
      ...cardSelect,
      status: true,
      description: true,
      topics: true,
      lessons: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, description: true, durationMinutes: true, isPreview: true, provider: true },
      },
    },
  });
}
export type CourseDetail = NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;
export type LessonSummary = CourseDetail["lessons"][number];

/** Server-only: includes the video id. Call only after `lessonGate` said "ok". */
export async function getLessonForPlayback(courseId: string, lessonId: string) {
  return db.courseLesson.findFirst({
    where: { id: lessonId, courseId },
    select: { id: true, provider: true, videoId: true },
  });
}

/** Uploaded cover bytes (if any). Not cached in-process: the CDN caches the response. */
export async function getUploadedCover(slug: string) {
  return db.courseCover.findFirst({ where: { course: { slug } }, select: { data: true, contentType: true } });
}

/** Fallback cover: the first YouTube video (intro first) — its id stays server-side. */
export async function getYouTubeCoverId(slug: string) {
  const lesson = await db.courseLesson.findFirst({
    where: { course: { slug }, provider: "YOUTUBE" },
    orderBy: [{ isPreview: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { videoId: true },
  });
  return lesson?.videoId ?? null;
}

export async function getEnrollment(userId: string, courseId: string) {
  await connection();
  return db.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
}

/** «كورساتي»: everything the member joined or bought (archived content stays visible to its owners). */
export async function getMyLibrary(userId: string) {
  await connection();
  return db.courseEnrollment.findMany({
    where: { userId, course: { status: { not: ContentStatus.DRAFT } } },
    orderBy: { updatedAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          kind: true,
          access: true,
          title: true,
          summary: true,
          presenter: true,
          status: true,
          coverVersion: true,
          _count: { select: { lessons: true } },
        },
      },
    },
  });
}
