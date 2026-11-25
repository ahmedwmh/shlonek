"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClockIcon, LockIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Gate } from "../access";
import { lessonPath } from "../cover";

export type LessonRow = {
  id: string;
  title: string;
  durationMinutes: number | null;
  isPreview: boolean;
  gate: Gate;
};

const PAGE = 15;

/**
 * Lesson titles are public (they describe the course); locked rows never link.
 * Long courses render 15 rows at a time and add more as the list scrolls into view.
 */
export function LessonList({
  slug,
  lessons,
  currentId,
  kind,
  scrollable = false,
}: {
  slug: string;
  lessons: LessonRow[];
  currentId?: string;
  kind: "COURSE" | "WORKSHOP";
  /** Sidebar mode: fixed height, scrolls on its own, keeps the current lesson in view. */
  scrollable?: boolean;
}) {
  const currentIndex = currentId ? lessons.findIndex((l) => l.id === currentId) : -1;
  const [shown, setShown] = useState(() => Math.max(PAGE, currentIndex + PAGE));
  const sentinel = useRef<HTMLLIElement>(null);
  const container = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || shown >= lessons.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown((n) => Math.min(n + PAGE, lessons.length)),
      { root: scrollable ? container.current : null, rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown, lessons.length, scrollable]);

  useEffect(() => {
    if (!scrollable || !currentId) return;
    container.current?.querySelector<HTMLElement>(`[data-lesson="${currentId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [currentId, scrollable]);

  if (lessons.length === 0) {
    return (
      <p className="rounded-3xl border-2 border-dashed border-foreground/30 px-4 py-8 text-center text-muted-foreground">
        {kind === "WORKSHOP" ? "المحاضرات تنضاف قريباً." : "الفيديوهات تنضاف قريباً."}
      </p>
    );
  }

  return (
    <ol
      ref={container}
      className={cn(
        "flex flex-col divide-y divide-foreground/10 overflow-hidden rounded-3xl border-2 border-foreground bg-background",
        scrollable && "max-h-[min(70svh,40rem)] overflow-y-auto overscroll-contain",
      )}
    >
      {lessons.slice(0, shown).map((lesson, i) => {
        const open = lesson.gate === "ok";
        const current = lesson.id === currentId;
        const body = (
          <>
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold tabular-nums",
                current ? "border-foreground bg-foreground text-background" : open ? "border-foreground" : "border-foreground/25",
              )}
            >
              {current ? <PlayIcon className="size-4 fill-current" /> : open ? i + 1 : <LockIcon className="size-4" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold leading-6">{lesson.title}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {lesson.isPreview && <span className="rounded-full border border-foreground px-2 py-px font-bold text-foreground">تعريفي مجاني</span>}
                {lesson.durationMinutes ? (
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="size-3.5" /> {lesson.durationMinutes} دقيقة
                  </span>
                ) : null}
              </span>
            </span>
          </>
        );
        return (
          <li key={lesson.id} data-lesson={lesson.id}>
            {open ? (
              <Link
                href={lessonPath(slug, lesson.id)}
                aria-current={current ? "true" : undefined}
                className={cn("flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted", current && "bg-muted")}
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3.5 text-muted-foreground">
                {body}
                <span className="sr-only">(مقفل)</span>
              </div>
            )}
          </li>
        );
      })}
      {shown < lessons.length && (
        <li ref={sentinel} className="px-4 py-3 text-center text-xs text-muted-foreground">
          …
        </li>
      )}
    </ol>
  );
}
