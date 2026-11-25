import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { lessonGate } from "@/features/courses/access";
import { coursePath, coverSrc, decodeSlug, lessonPath } from "@/features/courses/cover";
import { getCourseBySlug } from "@/features/courses/queries";
import { getViewerFacts } from "@/features/courses/viewer";
import { LessonList } from "@/features/courses/components/lesson-list";
import { PlayerStage } from "@/features/courses/components/player-stage";

export async function generateMetadata({ params }: PageProps<"/courses/[slug]/learn/[lessonId]">): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(decodeSlug(slug));
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  return { title: lesson ? `${lesson.title} · ${course!.title}` : course?.title, robots: { index: false } };
}

async function Learn({ params }: PageProps<"/courses/[slug]/learn/[lessonId]">) {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(decodeSlug(slug));
  const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
  if (!course || index < 0) notFound();
  const lesson = course.lessons[index];

  const { facts } = await getViewerFacts(course.id);
  const rows = course.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    durationMinutes: l.durationMinutes,
    isPreview: l.isPreview,
    gate: lessonGate(course, l, facts),
  }));
  const prev = rows.slice(0, index).reverse().find((r) => r.gate === "ok");
  const next = rows.slice(index + 1).find((r) => r.gate === "ok");
  const noun = course.kind === "WORKSHOP" ? "المحاضرات" : "محتوى الكورس";

  return (
    <>
      <nav aria-label="مسار الصفحة" className="mb-5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={coursePath(course.slug)} className="max-w-[45%] shrink-0 truncate hover:text-foreground">
          {course.title}
        </Link>
        <ChevronLeftIcon className="size-4 shrink-0" />
        <span className="truncate text-foreground">{lesson.title}</span>
      </nav>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* key: a fresh player per lesson (no stale video when moving next/previous) */}
          <PlayerStage
            key={lesson.id}
            courseId={course.id}
            lessonId={lesson.id}
            title={lesson.title}
            poster={coverSrc(course.slug, course.coverVersion)}
            gate={lessonGate(course, lesson, facts)}
            isSignedIn={facts.signedIn}
            priority
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">
              {index + 1} من {rows.length}
            </span>
            <h1 className="text-2xl leading-tight font-extrabold md:text-3xl">{lesson.title}</h1>
          </div>
          {lesson.description && <p className="leading-8 whitespace-pre-line text-muted-foreground">{lesson.description}</p>}
          <div className="flex items-center justify-between gap-3 border-t pt-5">
            {prev ? (
              <Button asChild variant="outline" className="rounded-full border-2 border-foreground">
                <Link href={lessonPath(course.slug, prev.id)}>
                  <ArrowRightIcon /> السابق
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {next && (
              <Button asChild className="rounded-full">
                <Link href={lessonPath(course.slug, next.id)}>
                  التالي <ArrowLeftIcon />
                </Link>
              </Button>
            )}
          </div>
        </div>
        <aside className="flex flex-col gap-3 lg:sticky lg:top-24">
          <h2 className="font-bold">{noun}</h2>
          <LessonList slug={course.slug} lessons={rows} currentId={lesson.id} kind={course.kind} scrollable />
        </aside>
      </div>
    </>
  );
}

export default function LessonPage(props: PageProps<"/courses/[slug]/learn/[lessonId]">) {
  return (
    <div className="shell max-w-6xl py-6 md:py-10">
      <Suspense
        fallback={
          <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
            <Skeleton className="aspect-video w-full rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        }
      >
        <Learn {...props} />
      </Suspense>
    </div>
  );
}
