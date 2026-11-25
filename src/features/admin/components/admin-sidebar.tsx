"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClockIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  CrownIcon,
  ExternalLinkIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: "inbox" | "orders" };

/** Grouped by what the owner is doing: following people, running services, money & setup. */
const groups: { label: string; items: Item[] }[] = [
  {
    label: "المتابعة",
    items: [
      { href: "/admin", label: "الرئيسية", icon: LayoutDashboardIcon, exact: true },
      { href: "/admin/inbox", label: "صندوق احچيلي", icon: InboxIcon, badge: "inbox" },
      { href: "/admin/members", label: "الأعضاء", icon: UsersIcon },
    ],
  },
  {
    label: "الخدمات",
    items: [
      { href: "/admin/consultations", label: "الاستشارات والتقويم", icon: CalendarClockIcon },
      { href: "/admin/exercises", label: "التمارين", icon: ClipboardListIcon },
      { href: "/admin/courses", label: "الكورسات والورشات", icon: GraduationCapIcon },
      { href: "/admin/premium", label: "بريميوم", icon: CrownIcon },
    ],
  },
  {
    label: "المالية والإعدادات",
    items: [
      { href: "/admin/orders", label: "الطلبات والمدفوعات", icon: ReceiptIcon, badge: "orders" },
      { href: "/admin/settings", label: "الإعدادات", icon: SettingsIcon },
    ],
  },
];

export function AdminSidebar({ counts }: { counts: { inbox: number; orders: number } }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar side="right" dir="rtl" className="border-s border-border/70">
      <SidebarHeader className="gap-1.5 px-5 pt-6 pb-4">
        <Link href="/admin" onClick={() => setOpenMobile(false)} aria-label="لوحة الإدارة" className="self-start">
          <Logo className="h-5 w-auto" />
        </Link>
        <span className="text-xs font-semibold text-muted-foreground">لوحة الإدارة</span>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="px-3 text-[0.7rem] font-bold tracking-wide text-muted-foreground/80">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const count = item.badge ? counts[item.badge] : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "h-10 rounded-xl px-3 font-medium transition-colors",
                          "data-[active=true]:bg-foreground data-[active=true]:font-bold data-[active=true]:text-background",
                          "data-[active=true]:hover:bg-foreground data-[active=true]:hover:text-background",
                        )}
                      >
                        <Link href={item.href} onClick={() => setOpenMobile(false)}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {count > 0 && (
                        <SidebarMenuBadge
                          className={cn(
                            "top-2.5 right-auto left-2 rounded-full px-1.5 text-[0.7rem] font-bold",
                            active ? "bg-background text-foreground" : "bg-foreground text-background",
                          )}
                        >
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-10 rounded-xl px-3 text-muted-foreground hover:text-foreground">
              <Link href="/">
                <ExternalLinkIcon />
                <span>الرجوع للموقع</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
