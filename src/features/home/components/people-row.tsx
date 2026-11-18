"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { Character, type CharacterName } from "@/components/brand/character";

/**
 * The five characters asking each other «شلونك؟». Each one lifts on hover and
 * says a line in a speech bubble; one bubble cycles on its own (off with reduced motion).
 * Widths follow each crop's real proportions so the group lines up like the original art.
 */
const people: { name: CharacterName; width: number; line: string }[] = [
  { name: "welcoming", width: 345, line: "هلا والله!" },
  { name: "relaxed", width: 240, line: "شلونك؟" },
  { name: "curious", width: 185, line: "صدگ؟!" },
  { name: "helpful", width: 248, line: "احچيلي" },
  { name: "thinking", width: 237, line: "مدري والله…" },
];
const total = people.reduce((n, p) => n + p.width, 0);

export function PeopleRow() {
  const reduce = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rowRef);
  const [hovered, setHovered] = useState<number | null>(null);
  const [auto, setAuto] = useState(1);

  // The auto-cycling bubble only ticks while the row is on screen.
  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => setAuto((i) => (i + 1) % people.length), 2800);
    return () => clearInterval(id);
  }, [reduce, inView]);

  const speaking = hovered ?? (reduce ? null : auto);

  return (
    // dir="ltr" keeps the original composition (characters face each other) inside the RTL page.
    <div ref={rowRef} dir="ltr" className="flex w-full items-end" role="img" aria-label="خمس شخصيات مرسومة يسألون بعض: شلونك؟">
      {people.map((p, i) => (
        <m.div
          key={p.name}
          className="relative"
          style={{ width: `${(p.width / total) * 100}%` }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.25 + i * 0.07 }}
          onHoverStart={() => setHovered(i)}
          onHoverEnd={() => setHovered(null)}
        >
          <AnimatePresence>
            {speaking === i && (
              <m.span
                key="bubble"
                aria-hidden
                dir="rtl"
                initial={{ opacity: 0, y: 8, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={`absolute -top-2 z-10 -translate-y-full rounded-2xl ${
                  // Edge characters anchor their bubble inward so it never leaves the screen.
                  i === 0 ? "left-[15%]" : i === people.length - 1 ? "right-[10%]" : "left-1/2 -translate-x-1/2"
                } rounded-be-sm border-2 border-foreground bg-background px-3 py-1 text-xs font-bold whitespace-nowrap shadow-[2px_2px_0_0_var(--foreground)] sm:text-sm`}
              >
                {p.line}
              </m.span>
            )}
          </AnimatePresence>
          <m.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
            <Character name={p.name} className="w-full" />
          </m.div>
        </m.div>
      ))}
    </div>
  );
}
