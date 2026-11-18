"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  WEEKDAY_LABELS,
  addMonths,
  compareMonths,
  monthGrid,
  monthLabel,
  parts,
  todayKey,
  type Month,
} from "../lib/calendar";

type Props = {
  month: Month;
  onMonthChange: (month: Month) => void;
  minMonth: Month;
  maxMonth: Month;
  /** Days that have at least one free slot. */
  availableDays: Set<number>;
  /** Days the member may pick right now (package weeks narrow this). */
  selectableDays: Set<number>;
  selectedDay: number | null;
  onSelect: (day: number) => void;
  /** Package: day key → session numbers already placed on that day. */
  sessionMarks?: Map<number, number[]>;
  /** Package: the 7-day window being edited, shaded on the grid. */
  highlight?: { from: number; to: number } | null;
};

/**
 * Full month view (Saturday-first, RTL). Every day is visible: free days are bold
 * with a dot, unavailable days are faded and can't be pressed, the chosen day is
 * filled black. Month changes slide in the reading direction.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  minMonth,
  maxMonth,
  availableDays,
  selectableDays,
  selectedDay,
  onSelect,
  sessionMarks,
  highlight,
}: Props) {
  const today = todayKey();
  // Weeks that are entirely in the past are dropped: less scrolling, same information.
  const weeks = useMemo(() => {
    const cells = monthGrid(month);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows.filter((row) => row.some((d) => d != null && d >= today));
  }, [month, today]);
  const [direction, setDirection] = useState(1);
  const canPrev = compareMonths(month, minMonth) > 0;
  const canNext = compareMonths(month, maxMonth) < 0;

  const go = (delta: number) => {
    setDirection(delta);
    onMonthChange(addMonths(month, delta));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => go(-1)} disabled={!canPrev} aria-label="الشهر السابق">
          <ChevronRightIcon className="size-5" />
        </Button>
        <p className="text-base font-extrabold sm:text-lg" aria-live="polite">
          {monthLabel(month)}
        </p>
        <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => go(1)} disabled={!canNext} aria-label="الشهر الجاي">
          <ChevronLeftIcon className="size-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-[0.7rem] font-bold text-muted-foreground sm:text-xs">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <m.div
            key={`${month.year}-${month.month}`}
            custom={direction}
            // RTL: the next month comes in from the left.
            initial={{ x: direction > 0 ? -32 : 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? 32 : -32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="flex flex-col gap-0.5"
          >
            {weeks.map((row, r) => (
              <div key={r} className="grid grid-cols-7">
                {row.map((day, i) => {
                  if (day == null) return <span key={`pad-${i}`} aria-hidden />;
                  const available = availableDays.has(day);
                  const selectable = selectableDays.has(day);
                  const selected = selectedDay === day;
                  const isToday = day === today;
                  const inWeek = highlight ? day >= highlight.from && day < highlight.to : false;
                  const marks = sessionMarks?.get(day);
                  const label = `${formatDate(new Date(day + 12 * 3_600_000))}${
                    selectable ? " — متاح" : available ? " — خارج أسبوع هذي الجلسة" : " — غير متاح"
                  }`;

                  return (
                    <div key={day} className={cn("flex h-11 items-center justify-center", inWeek && "bg-muted first:rounded-s-full last:rounded-e-full")}>
                      <button
                        type="button"
                        disabled={!selectable}
                        onClick={() => onSelect(day)}
                        aria-pressed={selected}
                        aria-label={label}
                        className={cn(
                          "relative grid size-10 place-items-center rounded-full text-sm tabular-nums transition-[background-color,color,transform] duration-150",
                          selectable && !selected && "font-extrabold hover:bg-foreground/8 active:scale-90",
                          selected && "bg-foreground font-extrabold text-background",
                          !selectable && "cursor-not-allowed text-foreground/25",
                          !selectable && available && "text-foreground/45",
                          isToday && !selected && "ring-2 ring-foreground/15 ring-inset",
                        )}
                      >
                        {parts(day).day}
                        {selectable && !selected && (
                          <span className="absolute bottom-1 size-1 rounded-full bg-foreground" aria-hidden />
                        )}
                        {marks && (
                          <span
                            className={cn(
                              "absolute -top-0.5 -end-0.5 grid size-4 place-items-center rounded-full text-[0.6rem] font-bold",
                              selected ? "bg-background text-foreground ring-2 ring-foreground" : "bg-foreground text-background",
                            )}
                            aria-hidden
                          >
                            {marks.join("،")}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </m.div>
        </AnimatePresence>
      </div>

      <ul className="flex items-center justify-center gap-5 pt-1 text-xs text-muted-foreground" aria-label="دليل التقويم">
        <li className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
          متاح
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded-full bg-foreground" aria-hidden />
          اختيارك
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded-full ring-2 ring-foreground/15 ring-inset" aria-hidden />
          اليوم
        </li>
      </ul>
    </div>
  );
}
