import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireViewer } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getAttempt } from "@/features/exercises/queries";
import { exerciseDefinitionSchema, type AttemptResult } from "@/features/exercises/definition";
import { ResultView } from "@/features/exercises/components/result-view";

export const metadata: Metadata = { title: "نتيجتك", robots: { index: false } };

async function AttemptContent({ params }: PageProps<"/exercises/[slug]/attempts/[attemptId]">) {
  const { slug, attemptId } = await params;
  const viewer = await requireViewer(`/exercises/${slug}/attempts/${attemptId}`);
  const attempt = await getAttempt(viewer.id, attemptId);
  if (!attempt || attempt.exercise.slug !== slug) notFound();

  const result = attempt.result as AttemptResult;
  const def = exerciseDefinitionSchema.safeParse(attempt.version.definition);
  const answers = attempt.answers as Record<string, string | number>;

  return (
    <>
      <p className="mb-2 text-center text-sm text-muted-foreground">
        {attempt.exercise.title} · {formatDateTime(attempt.completedAt)}
      </p>
      <div className="sketch-card p-6 md:p-10">
        <ResultView result={result} />
      </div>

      {def.success && (
        <details className="group mt-6 rounded-3xl border-2 border-foreground p-5 open:pb-6">
          <summary className="cursor-pointer list-none font-bold">
            إجاباتك <span className="text-sm font-normal text-muted-foreground">(خاصة بيك)</span>
          </summary>
          <dl className="mt-4 flex flex-col gap-4">
            {def.data.questions.map((q) => {
              const value = answers[q.id];
              const shown = q.type === "single" ? q.options.find((o) => o.id === value)?.label : value;
              return (
                <div key={q.id}>
                  <dt className="text-sm text-muted-foreground">{q.prompt}</dt>
                  <dd className="mt-1 whitespace-pre-line">{shown ?? "—"}</dd>
                </div>
              );
            })}
          </dl>
        </details>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="h-11 rounded-full px-6">
          <Link href={`/exercises/${slug}`}>
            <RotateCcwIcon /> أعد التمرين
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full border-2 border-foreground px-6">
          <Link href="/account/exercises">
            <HistoryIcon /> سجل نتائجي
          </Link>
        </Button>
      </div>
    </>
  );
}

export default function AttemptPage(props: PageProps<"/exercises/[slug]/attempts/[attemptId]">) {
  return (
    <div className="shell max-w-2xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
        <AttemptContent {...props} />
      </Suspense>
    </div>
  );
}
