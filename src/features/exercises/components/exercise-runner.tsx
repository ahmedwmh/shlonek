"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CloudIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRequestId } from "@/hooks/use-request-id";
import { submitAttempt } from "../actions";
import type { Answers, ExerciseDefinition } from "../definition";
import { useExerciseRunner, type SaveState } from "../hooks/use-exercise-runner";
import { QuestionField } from "./question-field";

type Props = {
  slug: string;
  title: string;
  intro: string;
  definition: ExerciseDefinition;
  initialAnswers: Answers | null;
};

// RTL: "forward" moves content toward the left.
const slide = {
  enter: (dir: 1 | -1) => ({ x: dir === 1 ? -48 : 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: dir === 1 ? 48 : -48, opacity: 0 }),
};

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const label = { saving: "دا نحفظ…", saved: "تم الحفظ", error: "ما انحفظت المسودة" }[state];
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {state === "saving" ? <Spinner className="size-3" /> : state === "saved" ? <CheckIcon className="size-3" /> : <CloudIcon className="size-3" />}
      {label}
    </span>
  );
}

/** One question per screen, animated, with a progress bar and autosaved draft. */
export function ExerciseRunner({ slug, title, intro, definition, initialAnswers }: Props) {
  const router = useRouter();
  const requestId = useRequestId();
  const [submitting, startSubmit] = useTransition();
  const runner = useExerciseRunner(slug, definition, initialAnswers);
  const progress = runner.step === 0 ? 0 : runner.step / runner.total;

  const submit = () => {
    if (!runner.next()) return;
    runner.flushDraft();
    startSubmit(async () => {
      const result = await submitAttempt({ slug, answers: runner.answers, clientRequestId: requestId.get() });
      if (result.ok) {
        requestId.renew();
        router.push(`/exercises/${slug}/attempts/${result.data.attemptId}`);
        return;
      }
      toast.error(result.error);
      if (result.fieldErrors) {
        const errors = Object.fromEntries(Object.entries(result.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""]));
        runner.setErrors(errors);
        const first = definition.questions.findIndex((q) => errors[q.id]);
        if (first >= 0) runner.goTo(first + 1);
      }
    });
  };

  return (
    <div className="sketch-card flex min-h-[28rem] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-3">
        <span className="text-sm font-semibold">
          {runner.step === 0 ? "المقدمة" : `السؤال ${runner.step} من ${runner.total}`}
        </span>
        <SaveIndicator state={runner.saveState} />
      </div>
      <div className="h-1.5 bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <m.div
          className="h-full origin-right bg-foreground"
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ type: "spring", stiffness: 140, damping: 24 }}
        />
      </div>

      <div className="relative flex-1 overflow-hidden p-6 md:p-10">
        <AnimatePresence mode="wait" custom={runner.direction} initial={false}>
          <m.div
            key={runner.step}
            custom={runner.direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {runner.question ? (
              <QuestionField
                question={runner.question}
                value={runner.answers[runner.question.id]}
                error={runner.errors[runner.question.id]}
                onChange={(v) => runner.setAnswer(runner.question!.id, v)}
                onSubmitShortcut={runner.isLast ? submit : () => runner.next()}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <SparklesIcon className="size-8" />
                <h2 className="text-3xl font-bold">{title}</h2>
                <p className="max-w-prose text-lg leading-8 text-muted-foreground">{intro}</p>
                <p className="text-sm text-muted-foreground">
                  {runner.total} أسئلة · إجاباتك خاصة وتنحفظ تلقائياً كمسودة.
                </p>
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 border-t-2 border-foreground px-5 py-4">
        <Button variant="ghost" onClick={runner.back} disabled={runner.step === 0 || submitting} className="rounded-full">
          <ArrowRightIcon />
          رجوع
        </Button>
        {runner.isLast ? (
          <Button onClick={submit} disabled={submitting} className="h-11 rounded-full px-7 text-base">
            {submitting ? <Spinner /> : <SparklesIcon />}
            انطلق
          </Button>
        ) : (
          <Button onClick={() => runner.next()} className="h-11 rounded-full px-7 text-base">
            {runner.step === 0 ? "ابدأ" : "التالي"}
            <ArrowLeftIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
