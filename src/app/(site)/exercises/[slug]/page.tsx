import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth/dal";
import { getAttemptsForExercise, getDraft, getExerciseBySlug, getPublishedExercises } from "@/features/exercises/queries";
import { isPremiumMember } from "@/features/premium/queries";
import { ExerciseRunner } from "@/features/exercises/components/exercise-runner";
import { AccessBadge } from "@/features/exercises/components/exercise-card";
import { StartLocked } from "@/features/exercises/components/start-locked";

export async function generateStaticParams() {
  const exercises = await getPublishedExercises();
  // Cache Components needs at least one param at build time (e.g. a fresh, empty database).
  return exercises.length ? exercises.map((e) => ({ slug: e.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/exercises/[slug]">): Promise<Metadata> {
  const exercise = await getExerciseBySlug((await params).slug);
  return exercise ? { title: exercise.title, description: exercise.summary } : {};
}

/**
 * Who sees what: visitors see the intro and must sign in to start; non-subscribers
 * see a premium exercise's intro and benefits but the questions never reach the browser.
 */
async function ExerciseBody({ slug }: { slug: string }) {
  const exercise = (await getExerciseBySlug(slug))!;
  const viewer = await getViewer();

  if (!viewer) {
    return <StartLocked reason="login" intro={exercise.version.intro} questionCount={exercise.definition.questions.length} />;
  }
  if (exercise.access === "PREMIUM" && !(await isPremiumMember(viewer.id))) {
    return <StartLocked reason="premium" intro={exercise.version.intro} questionCount={exercise.definition.questions.length} />;
  }

  const [draft, attempts] = await Promise.all([
    getDraft(viewer.id, exercise.version.id),
    getAttemptsForExercise(viewer.id, exercise.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {attempts.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3 text-sm">
          <span>سويت هذا التمرين {attempts.length === 1 ? "مرة وحدة" : `${attempts.length} مرات`}. هاي محاولة جديدة وما تمسح القديمة.</span>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/account/exercises">
              <HistoryIcon /> سجلي
            </Link>
          </Button>
        </div>
      )}
      <ExerciseRunner
        slug={exercise.slug}
        title={exercise.title}
        intro={exercise.version.intro}
        definition={exercise.definition}
        initialAnswers={draft}
      />
    </div>
  );
}

async function Exercise({ params }: PageProps<"/exercises/[slug]">) {
  const { slug } = await params;
  const exercise = await getExerciseBySlug(slug);
  if (!exercise) notFound();

  return (
    <>
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/exercises" className="hover:text-foreground">
          التمارين
        </Link>{" "}
        / <span className="text-foreground">{exercise.title}</span>
      </nav>
      <header className="mb-8 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">{exercise.title}</h1>
          <AccessBadge access={exercise.access} />
        </div>
        <p className="text-lg text-muted-foreground">{exercise.summary}</p>
      </header>
      <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-3xl" />}>
        <ExerciseBody slug={slug} />
      </Suspense>
    </>
  );
}

export default function ExercisePage(props: PageProps<"/exercises/[slug]">) {
  return (
    <div className="shell max-w-3xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-3xl" />}>
        <Exercise {...props} />
      </Suspense>
    </div>
  );
}
