"use server";

import { z } from "zod";
import { ExerciseAccess, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/dal";
import { fail, ok, toFailure, type ActionResult } from "@/lib/action-result";
import { isPremiumMember } from "@/features/premium/queries";
import { cleanText } from "@/features/posts/sanitize";
import { computeResult, normaliseAnswers, validateAnswers, type Answers } from "./definition";
import { getExerciseBySlug } from "./queries";

/** Loads the exercise and checks the member may take it now (premium while active). */
async function authorise(slug: string) {
  const viewer = await getViewer();
  if (!viewer) return { error: "سجّل دخولك حتى تحفظ تمرينك." } as const;
  const exercise = await getExerciseBySlug(slug);
  if (!exercise) return { error: "التمرين غير موجود." } as const;
  if (exercise.access === ExerciseAccess.PREMIUM && !(await isPremiumMember(viewer.id))) {
    return { error: "هذا التمرين للمشتركين ببريميوم." } as const;
  }
  return { viewer, exercise } as const;
}

function clean(answers: Answers): Answers {
  return Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, typeof v === "string" ? cleanText(v) : v]));
}

/** Autosaved private draft. Drafts are never counted as attempts. */
export async function saveDraft(slug: string, raw: unknown): Promise<ActionResult> {
  const auth = await authorise(slug);
  if ("error" in auth) return fail(auth.error!);
  const answers = normaliseAnswers(auth.exercise.definition, raw);

  await db.exerciseDraft.upsert({
    where: { userId_exerciseVersionId: { userId: auth.viewer.id, exerciseVersionId: auth.exercise.version.id } },
    create: { userId: auth.viewer.id, exerciseVersionId: auth.exercise.version.id, answers },
    update: { answers },
  });
  return ok();
}

const submitSchema = z.object({ slug: z.string(), answers: z.unknown(), clientRequestId: z.uuid() });

/**
 * Completes an attempt: validates every answer against THIS version, computes
 * the result with this version's rules and stores both permanently. Retakes
 * create new attempts; nothing is overwritten.
 */
export async function submitAttempt(input: z.infer<typeof submitSchema>): Promise<ActionResult<{ attemptId: string }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return fail("بيانات غير صحيحة.");
  const auth = await authorise(parsed.data.slug);
  if ("error" in auth) return fail(auth.error!);

  const { exercise, viewer } = auth;
  const answers = clean(normaliseAnswers(exercise.definition, parsed.data.answers));
  const errors = validateAnswers(exercise.definition, answers);
  if (Object.keys(errors).length) {
    return fail("كمّل الأسئلة المطلوبة.", Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]])));
  }

  const result = computeResult(exercise.definition, answers);
  try {
    const attempt = await db.$transaction(async (tx) => {
      const created = await tx.exerciseAttempt.create({
        data: {
          userId: viewer.id,
          exerciseId: exercise.id,
          exerciseVersionId: exercise.version.id,
          answers,
          result,
          clientRequestId: parsed.data.clientRequestId,
        },
      });
      await tx.exerciseDraft.deleteMany({ where: { userId: viewer.id, exerciseVersionId: exercise.version.id } });
      return created;
    });
    return ok({ attemptId: attempt.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.exerciseAttempt.findFirst({
        where: { userId: viewer.id, clientRequestId: parsed.data.clientRequestId },
        select: { id: true },
      });
      if (existing) return ok({ attemptId: existing.id });
    }
    return toFailure(error);
  }
}
