"use client";

import { useMemo } from "react";
import { m } from "motion/react";
import { CheckIcon, MoonIcon, SunIcon, SunsetIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { dayPeriod } from "../lib/calendar";

const icons = { morning: SunIcon, afternoon: SunsetIcon, evening: MoonIcon } as const;
const localFormat = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", { hour: "numeric", minute: "2-digit" });

/** Free times of the chosen day, grouped by part of the day, as large tap targets. */
export function TimeSlots({
  times,
  selected,
  onSelect,
  showLocalTime,
}: {
  times: number[];
  selected: number | null;
  onSelect: (ms: number) => void;
  showLocalTime: boolean;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; key: keyof typeof icons; items: number[] }>();
    for (const ms of times) {
      const p = dayPeriod(ms);
      const g = map.get(p.key) ?? { label: p.label, key: p.key, items: [] };
      g.items.push(ms);
      map.set(p.key, g);
    }
    return [...map.values()];
  }, [times]);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const Icon = icons[g.key];
        return (
          <section key={g.key} aria-label={g.label} className="flex flex-col gap-2">
            <h4 className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
              <Icon className="size-4" /> {g.label}
            </h4>
            <div role="radiogroup" aria-label={`أوقات ${g.label}`} className="grid grid-cols-2 gap-2 @[17rem]:grid-cols-3">
              {g.items.map((ms, i) => {
                const active = selected === ms;
                return (
                  <m.button
                    key={ms}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelect(ms)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative flex h-12 flex-col items-center justify-center rounded-2xl border-2 text-[0.95rem] font-extrabold transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/15 hover:border-foreground",
                    )}
                  >
                    {formatTime(new Date(ms))}
                    {showLocalTime && (
                      <span className={cn("text-[0.7rem] font-normal", active ? "text-background/70" : "text-muted-foreground")}>
                        بتوقيتك {localFormat.format(new Date(ms))}
                      </span>
                    )}
                    {active && (
                      <span className="absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full bg-background text-foreground ring-2 ring-foreground">
                        <CheckIcon className="size-3" />
                      </span>
                    )}
                  </m.button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
