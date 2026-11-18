import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Character, type CharacterName } from "@/components/brand/character";

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Friendly empty state that points to the next step. */
export function EmptyState({
  title,
  href,
  cta,
  character = "curious",
}: {
  title: string;
  href: string;
  cta: string;
  character?: CharacterName;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-foreground/30 p-10 text-center">
      <Character name={character} className="h-28 w-auto" />
      <p className="font-semibold">{title}</p>
      <Button asChild className="rounded-full">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-28 rounded-3xl" />
    </div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "solid" | "muted" }) {
  const cls =
    tone === "solid"
      ? "bg-foreground text-background"
      : tone === "muted"
        ? "bg-muted text-muted-foreground"
        : "border-2 border-foreground";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}
