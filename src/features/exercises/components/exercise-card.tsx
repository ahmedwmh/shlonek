import Link from "next/link";
import { ArrowLeftIcon, ClockIcon, CrownIcon, ListChecksIcon } from "lucide-react";
import type { ExerciseCardData } from "../queries";

export function AccessBadge({ access }: { access: "FREE" | "PREMIUM" }) {
  return access === "PREMIUM" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
      <CrownIcon className="size-3.5" strokeWidth={2.5} aria-hidden /> بريميوم
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border-2 border-foreground px-3 py-0.5 text-xs font-bold">مجاني</span>
  );
}

export function ExerciseCard({ exercise }: { exercise: ExerciseCardData }) {
  return (
    <Link
      href={`/exercises/${exercise.slug}`}
      className="sketch-card group flex h-full flex-col gap-4 p-6 transition-[translate,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-2xl font-bold">{exercise.title}</h3>
        <AccessBadge access={exercise.access} />
      </div>
      <p className="flex-1 leading-7 text-muted-foreground">{exercise.summary}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-4 text-muted-foreground">
          {exercise.estimatedMinutes && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-4" /> {exercise.estimatedMinutes} دقائق
            </span>
          )}
          {exercise.questionCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecksIcon className="size-4" /> {exercise.questionCount} أسئلة
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold">
          ابدأ <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
