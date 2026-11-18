"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import {
  CalendarIcon,
  CrownIcon,
  LayoutGridIcon,
  MessageSquareTextIcon,
  ReceiptIcon,
  SettingsIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/account", label: "نظرة عامة", icon: LayoutGridIcon },
  { href: "/account/posts", label: "مشاركاتي", icon: MessageSquareTextIcon },
  { href: "/account/consultations", label: "استشاراتي", icon: CalendarIcon },
  { href: "/account/exercises", label: "تماريني ونتائجي", icon: SparklesIcon },
  { href: "/account/subscription", label: "اشتراكي", icon: CrownIcon },
  { href: "/account/wallet", label: "محفظتي", icon: WalletIcon },
  { href: "/account/orders", label: "طلباتي ومدفوعاتي", icon: ReceiptIcon },
  { href: "/account/settings", label: "الإعدادات", icon: SettingsIcon },
];

/** Horizontal scroller on phones, vertical list on desktop; the active pill glides between items. */
export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="أقسام حسابي" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="relative shrink-0">
              {active && (
                <m.span layoutId="account-nav-active" className="absolute inset-0 rounded-full bg-foreground" />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                  active ? "text-background" : "hover:bg-muted",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
