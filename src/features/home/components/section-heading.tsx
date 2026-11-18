import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Eyebrow + title + optional description/action — one rhythm for every home section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  id,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8", className)}>
      <div className="flex max-w-2xl flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <span className="h-0.5 w-6 rounded-full bg-foreground" aria-hidden />
          {eyebrow}
        </span>
        <h2 id={id} className="scroll-mt-28 text-2xl leading-tight font-extrabold text-balance sm:text-3xl md:text-4xl">
          {title}
        </h2>
        {description && <p className="text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{description}</p>}
      </div>
      {action}
    </div>
  );
}
