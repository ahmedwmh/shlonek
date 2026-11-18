"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { ContentStatus, ExerciseAccess, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tags } from "@/lib/cache-tags";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { exerciseDefinitionSchema } from "@/features/exercises/definition";
import { admin, parse, zId, zText } from "../shared/guard";

const optionalMinutes = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.coerce.number().int().min(1).max(240).nullable(),
);

const metaSchema = z.object({
  title: zText(80, 2),
  summary: zText(300, 3),
  access: z.enum(ExerciseAccess),
  estimatedMinutes: optionalMinutes,
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

function invalidate(slug: string) {
  updateTag(tags.exercises);
  updateTag(tags.exercise(slug));
}

export async function createExercise(input: unknown): Promise<ActionResult<{ id: string }>> {
  const viewer = await admin();
  const v = parse(
    metaSchema.extend({
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "حروف إنجليزية صغيرة وأرقام وشرطات فقط")
        .max(60),
    }),
    input,
  );
  if (!v.ok) return v.result;
  try {
    const e = await db.exercise.create({ data: { ...v.data, status: ContentStatus.DRAFT } });
    await audit({ actorId: viewer.id, action: "exercise.create", entityType: "Exercise", entityId: e.id });
    return ok({ id: e.id }, "انضاف التمرين كمسودة");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("هذا الرابط مستخدم.", { slug: ["هذا الرابط مستخدم"] });
    }
    throw error;
  }
}

export async function updateExercise(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(metaSchema.extend({ id: zId, status: z.enum(ContentStatus) }), input);
  if (!v.ok) return v.result;
  const { id, ...data } = v.data;

  const current = await db.exercise.findUnique({ where: { id }, select: { slug: true, currentVersionId: true, access: true, status: true } });
  if (!current) return fail("التمرين غير موجود.");
  if (data.status === ContentStatus.PUBLISHED && !current.currentVersionId) {
    return fail("انشر نسخة من المحتوى أول، بعدين انشر التمرين.");
  }

  await db.exercise.update({ where: { id }, data });
  if (current.access !== data.access || current.status !== data.status) {
    await audit({
      actorId: viewer.id,
      action: "exercise.update",
      entityType: "Exercise",
      entityId: id,
      meta: { access: [current.access, data.access], status: [current.status, data.status] },
    });
  }
  invalidate(current.slug);
  refresh();
  return ok(undefined, "انحفظ التمرين");
}

/**
 * Publishes a NEW immutable version. Past attempts keep pointing at the version
 * they were taken with, so their answers and results never change.
 */
export async function publishVersion(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(z.object({ exerciseId: zId, intro: zText(2000, 5), definition: z.string().min(2).max(100_000) }), input);
  if (!v.ok) return v.result;

  let json: unknown;
  try {
    json = JSON.parse(v.data.definition);
  } catch {
    return fail("JSON غير صحيح.", { definition: ["JSON غير صحيح"] });
  }
  const def = exerciseDefinitionSchema.safeParse(json);
  if (!def.success) {
    return fail("المحتوى ما مطابق للهيكل.", { definition: def.error.issues.map((i) => `${i.path.join(".") || "—"}: ${i.message}`) });
  }

  const exercise = await db.exercise.findUnique({ where: { id: v.data.exerciseId }, select: { id: true, slug: true } });
  if (!exercise) return fail("التمرين غير موجود.");

  await db.$transaction(async (tx) => {
    const last = await tx.exerciseVersion.findFirst({ where: { exerciseId: exercise.id }, orderBy: { version: "desc" }, select: { version: true } });
    const version = await tx.exerciseVersion.create({
      data: {
        exerciseId: exercise.id,
        version: (last?.version ?? 0) + 1,
        intro: v.data.intro,
        definition: def.data,
        publishedAt: new Date(),
      },
    });
    await tx.exercise.update({ where: { id: exercise.id }, data: { currentVersionId: version.id } });
    await audit({ actorId: viewer.id, action: "exercise.version", entityType: "Exercise", entityId: exercise.id, meta: { version: version.version } }, tx);
  });
  invalidate(exercise.slug);
  refresh();
  return ok(undefined, "انتشرت نسخة جديدة");
}

/** Only drafts without attempts can be deleted; anything with history is archived. */
export async function deleteExercise(id: string): Promise<ActionResult> {
  const viewer = await admin();
  const e = await db.exercise.findUnique({ where: { id }, select: { slug: true, _count: { select: { attempts: true } } } });
  if (!e) return fail("التمرين غير موجود.");
  if (e._count.attempts > 0) return fail("عليه محاولات أعضاء، أرشفه بدل الحذف.");
  await db.exercise.delete({ where: { id } });
  await audit({ actorId: viewer.id, action: "exercise.delete", entityType: "Exercise", entityId: id });
  invalidate(e.slug);
  return ok(undefined, "انحذف التمرين");
}
