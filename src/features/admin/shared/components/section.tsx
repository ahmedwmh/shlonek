import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The admin card: soft border, gentle shadow, generous padding and a clear
 * header (title · description · actions). Use `fill` inside equal-height grids.
 */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  fill,
  footer,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Stretch to the grid row height (equal-height cards). */
  fill?: boolean;
  footer?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        fill && "h-full",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 md:px-6 md:pt-6">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("flex-1 px-5 pb-5 md:px-6 md:pb-6", title || actions ? "pt-4" : "pt-5 md:pt-6")}>{children}</div>
      {footer && <footer className="border-t border-border/70 px-5 py-3.5 md:px-6">{footer}</footer>}
    </section>
  );
}

/**
 * Table frame: rounded border, horizontal scroll on phones, calm muted header,
 * comfortable rows, tabular numbers and a hover state — applied to any shadcn Table inside.
 */
export function TableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border/70",
        "[&_table]:w-full [&_thead_tr]:border-border/70 [&_thead_tr]:bg-muted/50 [&_thead_tr:hover]:bg-muted/50",
        "[&_th]:h-11 [&_th]:px-4 [&_th]:text-xs [&_th]:font-bold [&_th]:text-muted-foreground",
        "[&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle [&_td]:tabular-nums",
        "[&_tbody_tr]:border-border/60 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40 [&_tbody_tr:last-child]:border-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Label/value rows with even spacing (used in summary cards). */
export function InfoList({ items }: { items: { label: string; value: ReactNode; tone?: "default" | "danger" }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-border/60">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
          <dt className={cn("text-muted-foreground", item.tone === "danger" && "text-destructive")}>{item.label}</dt>
          <dd className={cn("text-end font-semibold", item.tone === "danger" && "text-destructive")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
