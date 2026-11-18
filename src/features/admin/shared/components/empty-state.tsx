import type { ReactNode } from "react";
import { InboxIcon, type LucideIcon } from "lucide-react";

/** Calm, centred empty state with an icon chip and optional action. */
export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <span className="mb-1 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
