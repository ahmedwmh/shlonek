"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { isActivePath, mainNav } from "./nav-items";

/** Same nav without the active state, used while the pathname streams in. */
export function MainNavFallback() {
  return (
    <nav aria-label="التنقل الرئيسي" className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full border-2 border-foreground p-1">
        {mainNav.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-muted">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Desktop navigation with a shared-layout pill that glides to the active page. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="التنقل الرئيسي" className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full border-2 border-foreground p-1">
        {mainNav.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="relative">
              {active && (
                <m.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 block rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  active ? "text-background" : "text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
