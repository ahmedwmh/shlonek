import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getMyExerciseHistory } from "@/features/exercises/queries";
import type { AttemptResult } from "@/features/exercises/definition";
import { EmptyState, SectionHeader, SectionSkeleton, StatusPill } from "@/features/account/components/section";

export const metadata: Metadata = { title: "تماريني ونتائجي" };

/** Every attempt is a separate, permanent record — newest first, per exercise. */
async function History() {
  const viewer = await requireViewer("/account/exercises");
  const history = await getMyExerciseHistory(viewer.id);

  if (history.length === 0) {
    return <EmptyState title="ما سويت أي تمرين بعد." href="/exercises" cta="ابدأ أول تمرين" character="thinking" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {history.map(({ exercise, attempts }) => (
        <section key={exercise.id} className="sketch-card p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">{exercise.title}</h3>
              <p className="text-sm text-muted-foreground">{attempts.length} محاولة</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full border-2 border-foreground">
              <Link href={`/exercises/${exercise.slug}`}>
                <RotateCcwIcon /> أعد التمرين
              </Link>
            </Button>
          </div>
          <ol className="relative flex flex-col gap-2 border-s-2 border-foreground/15 ps-4">
            {attempts.map((a, i) => {
              const result = a.result as AttemptResult;
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -start-[1.42rem] top-4 size-3 rounded-full border-2 border-foreground bg-background" />
                  <Link
                    href={`/exercises/${exercise.slug}/attempts/${a.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{result.title}</span>
                      {i === 0 && <StatusPill tone="solid">الأحدث</StatusPill>}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(a.completedAt)} · نسخة {a.version.version}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export default function MyExercisesPage() {
  return (
    <>
      <SectionHeader title="تماريني ونتائجي" description="كل محاولة تنحفظ لحالها، حتى تشوف شلون تتغير مع الوقت." />
      <Suspense fallback={<SectionSkeleton />}>
        <History />
      </Suspense>
    </>
  );
}
