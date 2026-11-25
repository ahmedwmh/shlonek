import { CrownIcon } from "lucide-react";
import type { CourseAccess, CourseKind } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { formatIQD } from "@/lib/format";

export const kindLabel: Record<CourseKind, string> = { COURSE: "كورس", WORKSHOP: "ورشة" };

/** «مجاني» · price · «مجانية لبريميوم» — the access line every card and page shows. */
export function AccessBadge({
  access,
  kind,
  price,
  className,
}: {
  access: CourseAccess;
  kind: CourseKind;
  price?: number | null;
  className?: string;
}) {
  if (access === "PREMIUM") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background", className)}>
        <CrownIcon className="size-3.5" strokeWidth={2.5} aria-hidden /> مجانية لبريميوم
      </span>
    );
  }
  if (access === "PAID" && price) {
    return (
      <span className={cn("inline-flex items-center rounded-full border-2 border-foreground bg-background px-3 py-0.5 text-xs font-bold tabular-nums", className)}>
        {formatIQD(price)}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center rounded-full border-2 border-foreground bg-background px-3 py-0.5 text-xs font-bold", className)}>
      {kind === "WORKSHOP" ? "مجانية" : "مجاني"}
    </span>
  );
}
