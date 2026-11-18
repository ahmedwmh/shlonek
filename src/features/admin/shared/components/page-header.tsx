import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

/** Page title block: optional back link, title + description, actions aligned to the end. */
export function PageHeader({
  title,
  description,
  back,
  actions,
  leading,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** Optional visual before the title (e.g. an avatar). */
  leading?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 self-start rounded-full px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRightIcon className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-2xl font-extrabold md:text-[1.75rem]">{title}</h1>
            {description && <div className="text-sm leading-6 text-muted-foreground">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
