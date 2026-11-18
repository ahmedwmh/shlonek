import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ContentStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { exerciseDefinitionSchema, type ExerciseDefinition } from "./definition";

export type ExerciseCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  access: "FREE" | "PREMIUM";
  estimatedMinutes: number | null;
  questionCount: number;
};

/** Library cards. Never includes questions (safe for premium exercises). */
export async function getPublishedExercises(): Promise<ExerciseCardData[]> {
  "use cache";
  cacheTag(tags.exercises);
  cacheLife("hours");

  const rows = await db.exercise.findMany({
    where: { status: ContentStatus.PUBLISHED, currentVersionId: { not: null } },
    orderBy: { sortOrder: "asc" },
    include: { currentVersion: { select: { definition: true } } },
  });
  return rows.map((e) => {
    const def = exerciseDefinitionSchema.safeParse(e.currentVersion?.definition);
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      summary: e.summary,
      access: e.access,
      estimatedMinutes: e.estimatedMinutes,
      questionCount: def.success ? def.data.questions.length : 0,
    };
  });
}

/**
 * Full exercise incl. the current version's definition. Server-only: callers
 * decide whether the member may see the questions before passing them on.
 */
export async function getExerciseBySlug(slug: string) {
  "use cache";
  cacheTag(tags.exercises, tags.exercise(slug));
  cacheLife("hours");

  const e = await db.exercise.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    include: { currentVersion: true },
  });
  if (!e?.currentVersion) return null;
  const def = exerciseDefinitionSchema.safeParse(e.currentVersion.definition);
  if (!def.success) return null;
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    access: e.access,
    estimatedMinutes: e.estimatedMinutes,
    version: { id: e.currentVersion.id, number: e.currentVersion.version, intro: e.currentVersion.intro },
    definition: def.data as ExerciseDefinition,
  };
}

export async function getDraft(userId: string, versionId: string) {
  const draft = await db.exerciseDraft.findUnique({
    where: { userId_exerciseVersionId: { userId, exerciseVersionId: versionId } },
  });
  return (draft?.answers as Record<string, string | number> | undefined) ?? null;
}

export async function getAttemptsForExercise(userId: string, exerciseId: string) {
  return db.exerciseAttempt.findMany({
    where: { userId, exerciseId },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true, result: true, version: { select: { version: true } } },
  });
}

export async function getAttempt(userId: string, attemptId: string) {
  return db.exerciseAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      exercise: { select: { slug: true, title: true } },
      version: { select: { version: true, definition: true } },
    },
  });
}

/** For «تماريني ونتائجي»: every exercise the member did, with its attempts. */
export async function getMyExerciseHistory(userId: string) {
  const attempts = await db.exerciseAttempt.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      completedAt: true,
      result: true,
      exercise: { select: { id: true, slug: true, title: true } },
      version: { select: { version: true } },
    },
  });
  const byExercise = new Map<string, { exercise: (typeof attempts)[number]["exercise"]; attempts: typeof attempts }>();
  for (const a of attempts) {
    const entry = byExercise.get(a.exercise.id) ?? { exercise: a.exercise, attempts: [] };
    entry.attempts.push(a);
    byExercise.set(a.exercise.id, entry);
  }
  return [...byExercise.values()];
}
