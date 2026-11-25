import Link from "next/link";
import { ArrowLeftIcon, PlayCircleIcon, UserRoundIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { coursePath, coverSrc } from "../cover";
import type { CourseCardData } from "../queries";
import { AccessBadge, kindLabel } from "./course-badges";

/** Cover served by our own route (never exposes a video id), versioned for long caching. */
export function CourseCover({ slug, version, className, priority }: { slug: string; version: number; className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverSrc(slug, version)}
      alt=""
      width={1280}
      height={720}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}

export function lessonCountLabel(kind: "COURSE" | "WORKSHOP", count: number) {
  if (kind === "WORKSHOP") return count === 1 ? "محاضرة" : `${count} محاضرات`;
  return count === 1 ? "فيديو" : `${count} فيديوهات`;
}

export function CourseCard({ course, priority }: { course: CourseCardData; priority?: boolean }) {
  const count = course._count.lessons;
  return (
    <Link
      href={coursePath(course.slug)}
      className="sketch-card group flex h-full flex-col overflow-hidden transition-[translate,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)]"
    >
      <div className="relative aspect-video overflow-hidden border-b-2 border-foreground bg-muted">
        <CourseCover
          slug={course.slug}
          version={course.coverVersion}
          priority={priority}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
        <AccessBadge access={course.access} kind={course.kind} price={course.price} className="absolute start-3 top-3" />
        {count > 0 && (
          <span className="absolute end-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-bold">
            <PlayCircleIcon className="size-3.5" /> {lessonCountLabel(course.kind, count)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-bold text-muted-foreground">{kindLabel[course.kind]}</span>
        <h3 className="line-clamp-2 text-xl leading-8 font-bold">{course.title}</h3>
        <p className="line-clamp-2 flex-1 leading-7 text-muted-foreground">{course.summary}</p>
        <div className={cn("mt-2 flex items-center gap-3 border-t pt-3 text-sm", course.presenter ? "justify-between" : "justify-end")}>
          {course.presenter && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <UserRoundIcon className="size-4 shrink-0" /> <span className="truncate">{course.presenter}</span>
            </span>
          )}
          <span className="inline-flex shrink-0 items-center gap-1 font-bold">
            التفاصيل <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="sketch-card flex h-full flex-col overflow-hidden" aria-hidden>
      <div className="aspect-video animate-pulse border-b-2 border-foreground bg-muted" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
