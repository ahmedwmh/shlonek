"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { m } from "motion/react";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadCourses } from "../actions";
import { filtersFor, type CourseFilter, type CourseTab } from "../listing";
import type { CourseCardData, CoursePage } from "../queries";
import { CourseCard, CourseCardSkeleton } from "./course-card";

/** Tabs + filters (state lives in the URL, so a view can be shared) and a scroll-paginated grid. */
export function CourseBrowser({
  tab,
  filter,
  counts,
  initial,
}: {
  tab: CourseTab;
  filter: CourseFilter;
  counts: { courses: number; workshops: number };
  initial: CoursePage;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startNav] = useTransition();

  const go = (nextTab: CourseTab, nextFilter: CourseFilter) => {
    const q = new URLSearchParams({ tab: nextTab });
    if (nextFilter !== "all") q.set("filter", nextFilter);
    startNav(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="نوع المحتوى" className="inline-flex rounded-full border-2 border-foreground p-1">
          {(
            [
              ["courses", "الكورسات", counts.courses],
              ["workshops", "الورشات", counts.workshops],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => tab !== id && go(id, "all")}
              className="relative rounded-full px-5 py-2 text-sm font-bold"
            >
              {tab === id && <m.span layoutId="course-tab" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />}
              <span className={cn("relative z-10 transition-colors", tab === id && "text-background")}>
                {label} <span className="tabular-nums opacity-60">{count}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية">
          {filtersFor[tab].map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              onClick={() => filter !== f.id && go(tab, f.id)}
              className={cn(
                "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors",
                filter === f.id ? "border-foreground bg-foreground text-background" : "border-foreground/20 hover:border-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("transition-opacity duration-200", navigating && "pointer-events-none opacity-50")} aria-busy={navigating}>
        {/* A new tab/filter starts a fresh list. */}
        <InfiniteGrid key={`${tab}:${filter}`} tab={tab} filter={filter} initial={initial} />
      </div>
    </div>
  );
}

function InfiniteGrid({ tab, filter, initial }: { tab: CourseTab; filter: CourseFilter; initial: CoursePage }) {
  const [items, setItems] = useState<CourseCardData[]>(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const page = await loadCourses(tab, filter, items.length);
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...page.items.filter((c) => !seen.has(c.id))];
      });
      setHasMore(page.hasMore);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [tab, filter, items.length, hasMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || failed) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: "800px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, failed]);

  if (items.length === 0) {
    return (
      <p className="rounded-3xl bg-muted px-6 py-14 text-center text-muted-foreground">
        {tab === "courses" ? "الكورسات دا نحضّرها، ترجعلنا قريباً." : "ما كو ورشات بهذا التصنيف حالياً."}
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((course, i) => (
          <m.li
            key={course.id}
            initial={i < initial.items.length ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (i % 3) * 0.05 }}
          >
            <CourseCard course={course} priority={i < 3} />
          </m.li>
        ))}
        {loading &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={`skeleton-${i}`}>
              <CourseCardSkeleton />
            </li>
          ))}
      </ul>
      {failed && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" className="rounded-full border-2 border-foreground" onClick={loadMore}>
            <RotateCcwIcon /> حمّل المزيد
          </Button>
        </div>
      )}
      {hasMore && !failed && <div ref={sentinel} aria-hidden className="h-px" />}
    </>
  );
}
