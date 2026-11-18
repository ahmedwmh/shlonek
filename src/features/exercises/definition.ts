import { z } from "zod";

/**
 * Exercise content model, stored as JSON on each ExerciseVersion.
 * Admins build exercises from these question types without code changes.
 * Results never invent a score: "choice" reflects the member's own answer,
 * "summary" shows a reflective message after saving the answers.
 */

const base = {
  id: z.string().min(1).max(40),
  prompt: z.string().min(1).max(500),
  help: z.string().max(500).optional(),
  required: z.boolean().default(true),
};

export const questionSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("text"),
    placeholder: z.string().max(200).optional(),
    minLength: z.number().int().min(0).max(5000).default(2),
    maxLength: z.number().int().min(1).max(5000).default(1500),
  }),
  z.object({
    ...base,
    type: z.literal("single"),
    options: z
      .array(z.object({ id: z.string().min(1).max(40), label: z.string().min(1).max(120), description: z.string().max(300).optional() }))
      .min(2)
      .max(8),
  }),
  z.object({
    ...base,
    type: z.literal("scale"),
    min: z.number().int().default(1),
    max: z.number().int().default(5),
    minLabel: z.string().max(60).optional(),
    maxLabel: z.string().max(60).optional(),
  }),
]);

const outcomeSchema = z.object({ title: z.string().min(1).max(80), body: z.string().min(1).max(2000) });

export const resultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("choice"),
    /** The single-choice question whose answer becomes the result. */
    questionId: z.string(),
    outcomes: z.record(z.string(), outcomeSchema),
    /** Optional two-ended axis to visualise (e.g. love ↔ fear). */
    axis: z.object({ start: z.string(), end: z.string() }).optional(),
    note: z.string().max(300).optional(),
  }),
  z.object({
    kind: z.literal("summary"),
    title: z.string().min(1).max(80),
    body: z.string().min(1).max(2000),
  }),
]);

export const exerciseDefinitionSchema = z
  .object({
    questions: z.array(questionSchema).min(1).max(40),
    result: resultSchema,
  })
  .superRefine((def, ctx) => {
    const ids = new Set<string>();
    for (const q of def.questions) {
      if (ids.has(q.id)) ctx.addIssue({ code: "custom", message: `Duplicate question id "${q.id}"` });
      ids.add(q.id);
    }
    const rule = def.result;
    if (rule.kind === "choice") {
      const q = def.questions.find((x) => x.id === rule.questionId);
      if (!q || q.type !== "single") {
        ctx.addIssue({ code: "custom", message: "Choice result must point at a single-choice question" });
      } else {
        const missing = q.options.filter((o) => !rule.outcomes[o.id]);
        if (missing.length) ctx.addIssue({ code: "custom", message: "Every option needs an outcome" });
      }
    }
  });

export type Question = z.infer<typeof questionSchema>;
export type ExerciseDefinition = z.infer<typeof exerciseDefinitionSchema>;
export type Answers = Record<string, string | number>;

export type AttemptResult =
  | {
      kind: "choice";
      choiceId: string;
      title: string;
      body: string;
      note?: string;
      axis?: { start: { id: string; label: string }; end: { id: string; label: string } };
    }
  | { kind: "summary"; title: string; body: string };

/** Per-question validation errors (Arabic, user-facing). */
export function validateAnswers(def: ExerciseDefinition, answers: Answers, onlyIds?: string[]) {
  const errors: Record<string, string> = {};
  for (const q of def.questions) {
    if (onlyIds && !onlyIds.includes(q.id)) continue;
    const value = answers[q.id];
    const empty = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
    if (empty) {
      if (q.required) errors[q.id] = "هذا السؤال مطلوب.";
      continue;
    }
    if (q.type === "text") {
      const len = String(value).trim().length;
      if (len < q.minLength) errors[q.id] = `اكتب على الأقل ${q.minLength} حروف.`;
      else if (len > q.maxLength) errors[q.id] = `الحد الأقصى ${q.maxLength} حرف.`;
    } else if (q.type === "single") {
      if (!q.options.some((o) => o.id === value)) errors[q.id] = "اختار وحدة من الخيارات.";
    } else if (q.type === "scale") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < q.min || n > q.max) errors[q.id] = "اختار قيمة من المقياس.";
    }
  }
  return errors;
}

/** Keeps only known question ids with the right value types. */
export function normaliseAnswers(def: ExerciseDefinition, raw: unknown): Answers {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Answers = {};
  for (const q of def.questions) {
    const v = input[q.id];
    if (q.type === "scale" && (typeof v === "number" || typeof v === "string") && v !== "") out[q.id] = Number(v);
    else if (typeof v === "string") out[q.id] = q.type === "text" ? v.slice(0, q.maxLength + 100) : v;
  }
  return out;
}

export function computeResult(def: ExerciseDefinition, answers: Answers): AttemptResult {
  const rule = def.result;
  if (rule.kind === "summary") return { kind: "summary", title: rule.title, body: rule.body };

  const question = def.questions.find((q) => q.id === rule.questionId);
  const choiceId = String(answers[rule.questionId]);
  const outcome = rule.outcomes[choiceId];
  const label = (id: string) =>
    (question?.type === "single" ? question.options.find((o) => o.id === id)?.label : undefined) ?? id;

  return {
    kind: "choice",
    choiceId,
    title: outcome?.title ?? label(choiceId),
    body: outcome?.body ?? "",
    note: rule.note,
    axis: rule.axis
      ? { start: { id: rule.axis.start, label: label(rule.axis.start) }, end: { id: rule.axis.end, label: label(rule.axis.end) } }
      : undefined,
  };
}

export function parseDefinition(json: unknown): ExerciseDefinition {
  return exerciseDefinitionSchema.parse(json);
}
