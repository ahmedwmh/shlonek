import { cn } from "@/lib/utils";
import type { Labelled } from "../labels";

/**
 * One palette for every status in the dashboard:
 *  default → solid black (active / needs attention now)
 *  outline → neutral, secondary → muted / finished, destructive → soft red (problem).
 */
const tones: Record<Labelled["tone"], string> = {
  default: "bg-foreground text-background",
  outline: "border border-foreground/25 text-foreground",
  secondary: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

export function Pill({ tone = "outline", children, className }: { tone?: Labelled["tone"]; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Renders an enum value with its Arabic label and tone. */
export function StatusBadge({ map, value }: { map: Record<string, Labelled>; value: string }) {
  const item = map[value] ?? { label: value, tone: "secondary" as const };
  return <Pill tone={item.tone}>{item.label}</Pill>;
}
