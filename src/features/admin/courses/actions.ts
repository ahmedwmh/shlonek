"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { ContentStatus, EnrollmentSource, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tags } from "@/lib/cache-tags";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { parseVdoCipherId, parseYouTubeId } from "@/features/courses/video-ids";
import { firstFreeSlug, slugify } from "@/features/courses/slug";
import { fetchYouTubeDetails, type YouTubeDetails } from "@/features/courses/youtube-details";
import { admin, parse, zCheckbox, zId, zIQD, zText } from "../shared/guard";

/** Admins manage content and prices (requirements §07); staff can only view. */

const zOptionalInt = (min: number, max: number, msg: string) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().int(msg).min(min, msg).max(max, msg).nullable());
const zOptionalIQD = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), zIQD.nullable());

/** Slug from the title (Arabic or English), unique among all courses. */
async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title);
  const rows = await db.course.findMany({
    where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  });
  return firstFreeSlug(base, rows.map((r) => r.slug));
}

const isUniqueClash = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

function invalidate(slug: string) {
  updateTag(tags.courses);
  updateTag(tags.course(slug));
  refresh();
}

// ─────────────────────────────────────────────────────────────
// Course
// ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  kind: z.enum(["COURSE", "WORKSHOP"]),
  title: zText(120, 3),
  summary: zText(300, 10),
  /** Optional: the first video. Its YouTube description, topics, presenter and length fill the rest. */
  youtube: z.string().trim().max(300).default(""),
});

/** Admin helper: what YouTube says about a pasted link (used to pre-fill forms). */
export async function youtubeDetails(url: string): Promise<ActionResult<YouTubeDetails>> {
  await admin();
  const videoId = typeof url === "string" ? parseYouTubeId(url) : null;
  if (!videoId) return fail("رابط YouTube غير صحيح.");
  const details = await fetchYouTubeDetails(videoId);
  return details ? ok(details) : fail("ما گدرنا نقرأ معلومات الفيديو. تأكد إنه «غير مدرج» أو عام، مو خاص.");
}

export async function createCourse(input: unknown): Promise<ActionResult<{ id: string }>> {
  const viewer = await admin();
  const v = parse(createSchema, input);
  if (!v.ok) return v.result;
  const { youtube, ...fields } = v.data;

  let video: YouTubeDetails | null = null;
  if (youtube) {
    const videoId = parseYouTubeId(youtube);
    if (!videoId) return fail("تأكد من الرابط.", { youtube: ["الصق رابط YouTube صحيح أو خلي الحقل فارغ"] });
    video = (await fetchYouTubeDetails(videoId)) ?? { videoId, title: fields.title, presenter: null, summary: "", description: "", topics: [], durationMinutes: null };
  }

  // Two admins creating the same title at once: the unique index wins, retry once.
  for (let attempt = 0; ; attempt++) {
    try {
      const course = await db.course.create({
        data: {
          ...fields,
          slug: await uniqueSlug(fields.title),
          access: "FREE",
          status: ContentStatus.DRAFT,
          ...(video
            ? {
                description: video.description,
                topics: video.topics,
                presenter: video.presenter,
                lessons: {
                  create: { title: fields.title, provider: "YOUTUBE", videoId: video.videoId, durationMinutes: video.durationMinutes, sortOrder: 0 },
                },
              }
            : {}),
        },
      });
      await audit({ actorId: viewer.id, action: "course.create", entityType: "Course", entityId: course.id, meta: { kind: course.kind, fromYouTube: Boolean(video) } });
      invalidate(course.slug);
      return ok({ id: course.id }, "انضاف كمسودة");
    } catch (error) {
      if (!isUniqueClash(error) || attempt > 0) throw error;
    }
  }
}

const updateSchema = z.object({
  id: zId,
  title: zText(120, 3),
  summary: zText(300, 10),
  description: z.string().trim().max(5000, "الحد الأقصى 5000").default(""),
  topics: z.string().max(3000).default(""),
  presenter: z.string().trim().max(80).default(""),
  access: z.enum(["FREE", "PAID", "PREMIUM"]),
  price: zOptionalIQD,
  premiumPrice: zOptionalIQD,
  accessDays: zOptionalInt(1, 3650, "بين 1 و3650 يوم"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

type LessonFacts = { isPreview: boolean; provider: "YOUTUBE" | "VDOCIPHER" };

/** The publish rules from the requirements, as field errors the form can show. */
function publishProblems(kind: "COURSE" | "WORKSHOP", d: z.infer<typeof updateSchema>, lessons: LessonFacts[]) {
  const errors: Record<string, string[]> = {};
  const add = (field: string, message: string) => (errors[field] ??= []).push(message);

  if (kind === "WORKSHOP" && d.access === "PAID") add("access", "الورشة ما تنباع: خليها مجانية للمسجلين أو لبريميوم.");
  if (kind === "COURSE" && d.access === "PREMIUM") add("access", "الكورس يا مجاني يا مدفوع؛ بريميوم يعطي خصم بس.");
  if (lessons.length === 0) add("status", "ضيف فيديو واحد على الأقل قبل النشر.");
  if (kind === "WORKSHOP" && lessons.length > 2) add("status", "الورشة محاضرة وحدة أو محاضرتين.");

  if (d.access === "PAID") {
    if (d.price === null) add("price", "حدد سعر الكورس.");
    const previews = lessons.filter((l) => l.isPreview).length;
    if (previews !== 1) add("status", "الكورس المدفوع يحتاج فيديو تعريفي مجاني واحد بالضبط.");
    if (lessons.filter((l) => !l.isPreview).length === 0) add("status", "ضيف فيديوهات للكورس غير الفيديو التعريفي.");
  }
  // Protected videos must be DRM: an unlisted YouTube link can be shared freely.
  const protectedLessons = lessons.filter((l) => (d.access === "PAID" && !l.isPreview) || d.access === "PREMIUM");
  if (protectedLessons.some((l) => l.provider === "YOUTUBE")) {
    add("status", "الفيديوهات المقفلة لازم تكون على VdoCipher، مو YouTube.");
  }
  return errors;
}

export async function updateCourse(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(updateSchema, input);
  if (!v.ok) return v.result;
  const d = v.data;

  const before = await db.course.findUnique({
    where: { id: d.id },
    include: { lessons: { select: { isPreview: true, provider: true } }, _count: { select: { enrollments: true, orders: true } } },
  });
  if (!before) return fail("المحتوى غير موجود.");

  const errors: Record<string, string[]> = {};
  if (d.access === "PAID" && d.price !== null && d.premiumPrice !== null && d.premiumPrice > d.price) {
    errors.premiumPrice = ["سعر بريميوم لازم يكون أقل من السعر الأصلي أو يساويه."];
  }
  if (d.status === ContentStatus.PUBLISHED) Object.assign(errors, publishProblems(before.kind, d, before.lessons));
  if (d.status === ContentStatus.DRAFT && before.status !== ContentStatus.DRAFT && before._count.enrollments + before._count.orders > 0) {
    errors.status = ["عليه مشتركين: أرشفه بدل ما ترجعه مسودة."];
  }
  if (Object.keys(errors).length) return fail("تأكد من الحقول المعلّمة.", errors);

  const paid = d.access === "PAID";
  // The link follows the title while drafting; once published it stays fixed so shared links keep working.
  const slug = before.status === ContentStatus.DRAFT && d.title !== before.title ? await uniqueSlug(d.title, before.id) : before.slug;
  const data = {
    slug,
    title: d.title,
    summary: d.summary,
    description: d.description,
    topics: d.topics
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20),
    presenter: d.presenter || null,
    access: d.access,
    price: paid ? d.price : null,
    premiumPrice: paid ? d.premiumPrice : null,
    accessDays: paid ? d.accessDays : null,
    sortOrder: d.sortOrder,
    status: d.status,
    publishedAt: d.status === ContentStatus.PUBLISHED ? (before.publishedAt ?? new Date()) : before.publishedAt,
  };
  try {
    await db.course.update({ where: { id: d.id }, data });
  } catch (error) {
    if (isUniqueClash(error)) return fail("صار تعارض بالرابط، احفظ مرة ثانية.");
    throw error;
  }

  if (before.price !== data.price || before.premiumPrice !== data.premiumPrice || before.access !== data.access) {
    await audit({
      actorId: viewer.id,
      action: "price.course",
      entityType: "Course",
      entityId: d.id,
      meta: { access: [before.access, data.access], price: [before.price, data.price], premiumPrice: [before.premiumPrice, data.premiumPrice] },
    });
  }
  if (before.status !== data.status) {
    await audit({ actorId: viewer.id, action: `course.${data.status.toLowerCase()}`, entityType: "Course", entityId: d.id });
  }
  invalidate(before.slug);
  if (before.slug !== slug) invalidate(slug);
  return ok(undefined, "انحفظ");
}

/** Only untouched drafts are deleted; anything with members or orders is archived instead. */
export async function deleteCourse(id: string): Promise<ActionResult<{ deleted: boolean }>> {
  const viewer = await admin();
  const course = await db.course.findUnique({ where: { id }, include: { _count: { select: { enrollments: true, orders: true } } } });
  if (!course) return fail("المحتوى غير موجود.");
  if (course._count.enrollments + course._count.orders > 0) {
    await db.course.update({ where: { id }, data: { status: ContentStatus.ARCHIVED } });
    await audit({ actorId: viewer.id, action: "course.archived", entityType: "Course", entityId: id });
    invalidate(course.slug);
    return ok({ deleted: false }, "عليه مشتركين، فتأرشف بدل الحذف");
  }
  await db.course.delete({ where: { id } });
  await audit({ actorId: viewer.id, action: "course.delete", entityType: "Course", entityId: id });
  invalidate(course.slug);
  return ok({ deleted: true }, "انحذف");
}

// ─────────────────────────────────────────────────────────────
// Cover image
// ─────────────────────────────────────────────────────────────

const MAX_COVER_BYTES = 950_000;

/** Trust the bytes, not the file name: JPEG, PNG or WebP only. */
function sniffImage(bytes: Uint8Array) {
  const at = (i: number, ...sig: number[]) => sig.every((b, j) => bytes[i + j] === b);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}

export async function uploadCourseCover(formData: FormData): Promise<ActionResult> {
  const viewer = await admin();
  const courseId = formData.get("courseId");
  const file = formData.get("file");
  const dims = z
    .object({ width: z.coerce.number().int().min(160).max(4096), height: z.coerce.number().int().min(90).max(4096) })
    .safeParse({ width: formData.get("width"), height: formData.get("height") });
  if (typeof courseId !== "string" || !zId.safeParse(courseId).success) return fail("طلب غير صحيح.");
  if (!(file instanceof File) || file.size === 0) return fail("اختار صورة.");
  if (file.size > MAX_COVER_BYTES) return fail("الصورة كبيرة، اختار وحدة أصغر.");
  if (!dims.success) return fail("أبعاد الصورة غير مناسبة (أقل شي 160×90).");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffImage(bytes);
  if (!contentType) return fail("الصيغ المسموحة: JPG أو PNG أو WebP.");

  const course = await db.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  if (!course) return fail("المحتوى غير موجود.");
  const data = { data: bytes, contentType, width: dims.data.width, height: dims.data.height };
  await db.$transaction([
    db.courseCover.upsert({ where: { courseId }, create: { courseId, ...data }, update: data }),
    db.course.update({ where: { id: courseId }, data: { coverVersion: { increment: 1 } } }),
  ]);
  await audit({ actorId: viewer.id, action: "course.cover.upload", entityType: "Course", entityId: courseId, meta: { bytes: file.size } });
  invalidate(course.slug);
  return ok(undefined, "انحفظت الصورة");
}

export async function removeCourseCover(courseId: string): Promise<ActionResult> {
  const viewer = await admin();
  const course = await db.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  if (!course) return fail("المحتوى غير موجود.");
  await db.$transaction([
    db.courseCover.deleteMany({ where: { courseId } }),
    db.course.update({ where: { id: courseId }, data: { coverVersion: { increment: 1 } } }),
  ]);
  await audit({ actorId: viewer.id, action: "course.cover.remove", entityType: "Course", entityId: courseId });
  invalidate(course.slug);
  return ok(undefined, "انشالت الصورة");
}

// ─────────────────────────────────────────────────────────────
// Lessons
// ─────────────────────────────────────────────────────────────

const lessonSchema = z.object({
  courseId: zId,
  title: zText(160, 2),
  description: z.string().trim().max(2000).default(""),
  durationMinutes: zOptionalInt(1, 600, "بين 1 و600 دقيقة"),
  provider: z.enum(["YOUTUBE", "VDOCIPHER"]),
  video: z.string().trim().min(1, "مطلوب").max(300),
  isPreview: zCheckbox,
});

function videoIdFor(provider: "YOUTUBE" | "VDOCIPHER", value: string) {
  return provider === "YOUTUBE" ? parseYouTubeId(value) : parseVdoCipherId(value);
}

async function courseSlug(courseId: string) {
  return (await db.course.findUnique({ where: { id: courseId }, select: { slug: true } }))?.slug ?? null;
}

/** Without an uploaded cover the first YouTube video is the cover, so lesson edits refresh it. */
async function bumpCover(courseId: string) {
  await db.course.update({ where: { id: courseId }, data: { coverVersion: { increment: 1 } } });
}

export async function saveLesson(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(lessonSchema.extend({ id: z.string().max(64).optional() }), input);
  if (!v.ok) return v.result;
  const { id, courseId, video, ...rest } = v.data;

  const videoId = videoIdFor(rest.provider, video);
  if (!videoId) {
    return fail("تأكد من الفيديو.", {
      video: [rest.provider === "YOUTUBE" ? "الصق رابط YouTube صحيح (youtu.be/… أو youtube.com/…)" : "الصق Video ID من VdoCipher"],
    });
  }
  const slug = await courseSlug(courseId);
  if (!slug) return fail("المحتوى غير موجود.");

  await db.$transaction(async (tx) => {
    // One free intro per course: choosing a new one clears the old.
    if (rest.isPreview) await tx.courseLesson.updateMany({ where: { courseId, isPreview: true, ...(id ? { id: { not: id } } : {}) }, data: { isPreview: false } });
    const data = { ...rest, description: rest.description || null, videoId };
    if (id) {
      await tx.courseLesson.update({ where: { id, courseId }, data });
    } else {
      const last = await tx.courseLesson.aggregate({ where: { courseId }, _max: { sortOrder: true } });
      await tx.courseLesson.create({ data: { ...data, courseId, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    }
  });
  await audit({ actorId: viewer.id, action: id ? "course.lesson.update" : "course.lesson.create", entityType: "Course", entityId: courseId });
  await bumpCover(courseId);
  invalidate(slug);
  return ok(undefined, id ? "انحفظ الفيديو" : "انضاف الفيديو");
}

export async function moveLesson(input: unknown): Promise<ActionResult> {
  await admin();
  const v = parse(z.object({ id: zId, direction: z.enum(["up", "down"]) }), input);
  if (!v.ok) return v.result;
  const lesson = await db.courseLesson.findUnique({ where: { id: v.data.id }, select: { courseId: true } });
  if (!lesson) return fail("الفيديو غير موجود.");
  const list = await db.courseLesson.findMany({ where: { courseId: lesson.courseId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = list.findIndex((l) => l.id === v.data.id);
  const j = v.data.direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return ok(undefined, "");
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((l, index) => db.courseLesson.update({ where: { id: l.id }, data: { sortOrder: index } })));
  await bumpCover(lesson.courseId);
  const slug = await courseSlug(lesson.courseId);
  if (slug) invalidate(slug);
  return ok(undefined, "تغيّر الترتيب");
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  const viewer = await admin();
  const lesson = await db.courseLesson.findUnique({ where: { id }, include: { course: { select: { slug: true, status: true, lessons: { select: { id: true } } } } } });
  if (!lesson) return fail("الفيديو غير موجود.");
  if (lesson.course.status === ContentStatus.PUBLISHED && lesson.course.lessons.length <= 1) {
    return fail("هذا آخر فيديو بمحتوى منشور. ضيف غيره أو حوّله مسودة أول.");
  }
  await db.courseLesson.delete({ where: { id } });
  await bumpCover(lesson.courseId);
  await audit({ actorId: viewer.id, action: "course.lesson.delete", entityType: "Course", entityId: lesson.courseId });
  invalidate(lesson.course.slug);
  return ok(undefined, "انحذف الفيديو");
}

// ─────────────────────────────────────────────────────────────
// Access review: grant / end for a specific member
// ─────────────────────────────────────────────────────────────

export async function grantCourseAccess(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(
    z.object({
      courseId: zId,
      email: z.string().trim().toLowerCase().email("بريد غير صحيح"),
      days: zOptionalInt(1, 3650, "بين 1 و3650 يوم"),
      note: zText(300, 3),
    }),
    input,
  );
  if (!v.ok) return v.result;
  const { courseId, email, days, note } = v.data;
  const [user, slug] = await Promise.all([db.user.findUnique({ where: { email }, select: { id: true } }), courseSlug(courseId)]);
  if (!user) return fail("ما كو عضو بهذا البريد.", { email: ["العضو لازم يكون مسجّل بالموقع"] });
  if (!slug) return fail("المحتوى غير موجود.");

  const now = new Date();
  const endsAt = days ? new Date(now.getTime() + days * 86_400_000) : null;
  await db.courseEnrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId, source: EnrollmentSource.ADMIN, startsAt: now, endsAt },
    update: { source: EnrollmentSource.ADMIN, startsAt: now, endsAt },
  });
  await audit({ actorId: viewer.id, action: "course.grant", entityType: "Course", entityId: courseId, meta: { userId: user.id, days, note } });
  refresh();
  return ok(undefined, "تفعّل الوصول");
}

export async function endCourseAccess(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(z.object({ enrollmentId: zId, note: zText(300, 3) }), input);
  if (!v.ok) return v.result;
  const enrollment = await db.courseEnrollment.findUnique({ where: { id: v.data.enrollmentId } });
  if (!enrollment) return fail("غير موجود.");
  await db.courseEnrollment.update({ where: { id: enrollment.id }, data: { endsAt: new Date() } });
  await audit({
    actorId: viewer.id,
    action: "course.revoke",
    entityType: "Course",
    entityId: enrollment.courseId,
    meta: { userId: enrollment.userId, note: v.data.note },
  });
  refresh();
  return ok(undefined, "انتهى الوصول");
}
