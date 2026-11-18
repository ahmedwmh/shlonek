import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/dal";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { getSidebarCounts } from "@/features/admin/dashboard/queries";

export const metadata: Metadata = {
  title: { default: "لوحة الإدارة", template: "%s · لوحة الإدارة" },
  robots: { index: false, follow: false },
};

/**
 * Everything — including the navigation — renders only after the staff check,
 * so members and visitors get a 404 and never see the admin structure.
 */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  const counts = await getSidebarCounts();

  return (
    <SidebarProvider>
      <AdminSidebar counts={counts} />
      <SidebarInset className="min-w-0 bg-muted/30">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger aria-label="القائمة" className="size-9 rounded-full" />
            <span className="h-5 w-px bg-border" aria-hidden />
            <span className="text-sm font-bold">لوحة الإدارة</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden items-center gap-2 text-muted-foreground sm:inline-flex">
              <span className="grid size-7 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
                {viewer.name.slice(0, 1)}
              </span>
              {viewer.name}
            </span>
            <Link
              href="/"
              className="rounded-full border border-border/70 px-3 py-1.5 font-semibold transition-colors hover:border-foreground"
            >
              الموقع
            </Link>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-svh bg-muted/30">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-8">
        <Skeleton className="mb-3 h-8 w-48 rounded-lg" />
        <Skeleton className="mb-8 h-4 w-72 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
