import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronLeftIcon, ClockIcon, PlayCircleIcon, UserRoundIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { absoluteUrl } from "@/lib/site";
import { isWaylActive } from "@/features/payments/orders";
import { lessonGate } from "@/features/courses/access";
import { coursePath, coverSrc, decodeSlug } from "@/features/courses/cover";
import { getCourseBySlug, getPublishedCourses, type CourseDetail } from "@/features/courses/queries";
import { getViewerFacts } from "@/features/courses/viewer";
import { AccessBadge, kindLabel } from "@/features/courses/components/course-badges";
import { CourseActionCard } from "@/features/courses/components/course-action-card";
import { ExpandableText } from "@/features/courses/components/expandable-text";
import { LessonList } from "@/features/courses/components/lesson-list";
import { PlayerStage } from "@/features/courses/components/player-stage";

export async function generateStaticParams() {
  const items = await getPublishedCourses();
  // Cache Components needs at least one param at build time (e.g. a fresh, empty database).
  return items.length ? items.map((c) => ({ slug: c.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const course = await getCourseBySlug(decodeSlug((await params).slug));
  if (!course) return {};
  const image = absoluteUrl(coverSrc(course.slug, course.coverVersion));
  return {
    title: course.title,
    description: course.summary,
    alternates: { canonical: coursePath(course.slug) },
    openGraph: { title: course.title, description: course.summary, images: [{ url: image, width: 1280, height: 720 }] },
    twitter: { card: "summary_large_image", images: [image] },
    ...(course.status === "ARCHIVED" ? { robots: { index: false } } : {}),
  };
}

/** The video at the top: a paid course's free intro, otherwise the first lesson. */
const stageLessonOf = (course: CourseDetail) => (course.access === "PAID" ? course.lessons.find((l) => l.isPreview) : course.lessons[0]);

function StageFallback({ course }: { course: CourseDetail }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl border-2 border-foreground bg-muted shadow-[6px_6px_0_0_var(--foreground)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={coverSrc(course.slug, course.coverVersion)} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
    </div>
  );
}

async function Stage({ course }: { course: CourseDetail }) {
  const lesson = stageLessonOf(course);
  if (!lesson) return <StageFallback course={course} />;
  const { facts } = await getViewerFacts(course.id);
  return (
    <PlayerStage
      courseId={course.id}
      lessonId={lesson.id}
      title={lesson.title}
      poster={coverSrc(course.slug, course.coverVersion)}
      gate={lessonGate(course, lesson, facts)}
      isSignedIn={facts.signedIn}
      priority
    />
  );
}

async function ActionCard({ course }: { course: CourseDetail }) {
  const [{ facts }, waylActive] = await Promise.all([getViewerFacts(course.id), isWaylActive()]);
  const rows = course.lessons.map((l) => ({ ...l, gate: lessonGate(course, l, facts) }));
  const firstOpen = rows.find((r) => r.gate === "ok" && !r.isPreview) ?? rows.find((r) => r.gate === "ok") ?? rows[0];
  const single = course.access !== "PAID" && course.lessons.length === 1 ? course.lessons[0].id : undefined;
  return <CourseActionCard course={course} facts={facts} firstLessonId={firstOpen?.id} playHereLessonId={single} waylActive={waylActive} />;
}

async function Lessons({ course }: { course: CourseDetail }) {
  const { facts } = await getViewerFacts(course.id);
  const rows = course.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    durationMinutes: l.durationMinutes,
    isPreview: l.isPreview,
    gate: lessonGate(course, l, facts),
  }));
  return <LessonList slug={course.slug} lessons={rows} kind={course.kind} />;
}

function CourseJsonLd({ course }: { course: CourseDetail }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    url: absoluteUrl(coursePath(course.slug)),
    image: absoluteUrl(coverSrc(course.slug, course.coverVersion)),
    inLanguage: "ar",
    provider: { "@type": "Organization", name: "شلونك", url: absoluteUrl("/") },
    ...(course.presenter ? { instructor: { "@type": "Person", name: course.presenter } } : {}),
    offers: {
      "@type": "Offer",
      category: course.access === "PAID" ? "Paid" : "Free",
      price: course.access === "PAID" ? course.price : 0,
      priceCurrency: "IQD",
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

async function CourseView({ params }: PageProps<"/courses/[slug]">) {
  const course = await getCourseBySlug(decodeSlug((await params).slug));
  if (!course) notFound();

  const isWorkshop = course.kind === "WORKSHOP";
  const count = course.lessons.length;
  const minutes = course.lessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
  // The description often already opens with the summary (e.g. both taken from YouTube): don't repeat it.
  const lead = course.summary.replace(/…$/, "");
  const about = !course.description ? course.summary : course.description.startsWith(lead) ? course.description : `${course.summary}\n\n${course.description}`;

  return (
    <>
      <CourseJsonLd course={course} />
      <nav aria-label="مسار الصفحة" className="mb-5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={isWorkshop ? "/courses?tab=workshops" : "/courses"} className="shrink-0 hover:text-foreground">
          {isWorkshop ? "الورشات" : "الكورسات"}
        </Link>
        <ChevronLeftIcon className="size-4 shrink-0" />
        <span className="truncate text-foreground">{course.title}</span>
      </nav>

      <section aria-label={isWorkshop ? "الورشة" : "الفيديو التعريفي"}>
        <Suspense fallback={<StageFallback course={course} />}>
          <Stage course={course} />
        </Suspense>
      </section>

      <div className="mt-10 grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <header className="flex min-w-0 flex-col gap-4 lg:col-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{kindLabel[course.kind]}</span>
            <AccessBadge access={course.access} kind={course.kind} price={course.price} />
            {course.status === "ARCHIVED" && <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">مؤرشف</span>}
          </div>
          <h1 className="text-3xl leading-tight font-extrabold text-balance md:text-[2.6rem]">{course.title}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {course.presenter && (
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="grid size-8 place-items-center rounded-full border-2 border-foreground">
                  <UserRoundIcon className="size-4" />
                </span>
                {course.presenter}
              </span>
            )}
            {count > 0 && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <PlayCircleIcon className="size-4" />
                {isWorkshop ? (count === 1 ? "محاضرة وحدة" : `${count} محاضرات`) : count === 1 ? "فيديو واحد" : `${count} فيديوهات`}
              </span>
            )}
            {minutes > 0 && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <ClockIcon className="size-4" /> {minutes} دقيقة
              </span>
            )}
          </div>
          <ExpandableText text={about} className="text-base md:text-lg" />
        </header>

        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-stretch">
          <div className="lg:sticky lg:top-24">
            <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}>
              <ActionCard course={course} />
            </Suspense>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-10 lg:col-start-1">
          {course.topics.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">المحاور</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.topics.map((t) => (
                  <li key={t} className="flex items-start gap-3 rounded-2xl border-2 border-foreground/10 p-4 leading-7">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-background">
                      <CheckIcon className="size-3.5" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {count > 1 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">{isWorkshop ? "المحاضرات" : "محتوى الكورس"}</h2>
              <Suspense fallback={<Skeleton className="h-48 rounded-3xl" />}>
                <Lessons course={course} />
              </Suspense>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="aspect-video w-full rounded-3xl" />
      <div className="grid gap-10 lg:grid-cols-[1fr_23rem]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}

export default function CoursePage(props: PageProps<"/courses/[slug]">) {
  return (
    <div className="shell max-w-6xl py-6 md:py-10">
      <Suspense fallback={<PageSkeleton />}>
        <CourseView {...props} />
      </Suspense>
    </div>
  );
}
