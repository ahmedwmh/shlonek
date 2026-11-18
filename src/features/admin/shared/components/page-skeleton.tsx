import { Skeleton } from "@/components/ui/skeleton";

/** Matches the page rhythm: header, a row of cards, then a list. */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="جاري التحميل">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-52 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 p-5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
