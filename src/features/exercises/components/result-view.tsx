"use client";

import { m } from "motion/react";
import type { AttemptResult } from "../definition";

/** Love ↔ fear style axis: a marker glides to the end the member chose. */
function Axis({ axis, choiceId }: { axis: NonNullable<Extract<AttemptResult, { kind: "choice" }>["axis"]>; choiceId: string }) {
  const atStart = choiceId === axis.start.id;
  return (
    <div className="flex flex-col gap-2" aria-label={`المحور بين ${axis.start.label} و${axis.end.label}`}>
      <div className="relative h-3 rounded-full border-2 border-foreground">
        {/* RTL: the start label sits on the right, so the marker travels along `right`. */}
        <div className="absolute inset-y-0 inset-x-3.5">
          <m.span
            className="absolute top-1/2 size-7 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-foreground shadow-[0_0_0_4px_var(--background)]"
            initial={{ right: "50%" }}
            animate={{ right: atStart ? "0%" : "100%" }}
            transition={{ type: "spring", stiffness: 90, damping: 14, delay: 0.3 }}
          />
        </div>
      </div>
      <div className="flex justify-between text-sm font-semibold">
        <span className={atStart ? "" : "text-muted-foreground"}>{axis.start.label}</span>
        <span className={!atStart ? "" : "text-muted-foreground"}>{axis.end.label}</span>
      </div>
    </div>
  );
}

export function ResultView({ result }: { result: AttemptResult }) {
  return (
    <div className="flex flex-col gap-6">
      <m.h2
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="text-center text-6xl font-extrabold md:text-7xl"
      >
        {result.title}
      </m.h2>
      {result.kind === "choice" && result.axis && <Axis axis={result.axis} choiceId={result.choiceId} />}
      {result.body && <p className="text-lg leading-8">{result.body}</p>}
      {result.kind === "choice" && result.note && (
        <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{result.note}</p>
      )}
    </div>
  );
}
