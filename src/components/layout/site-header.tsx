import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, isStaff } from "@/lib/auth/dal";
import { getPremiumStatus } from "@/features/premium/queries";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { LoginButton } from "@/features/auth/components/login-button";
import { MainNav, MainNavFallback } from "./main-nav";
import { MobileNav } from "./mobile-nav";

async function HeaderAccount() {
  const viewer = await getViewer();
  if (!viewer) return <LoginButton />;
  const { isPremium } = await getPremiumStatus(viewer.id);
  return <AccountMenu name={viewer.name} isStaff={isStaff(viewer)} isPremium={isPremium} />;
}

/** Logo on the right (RTL start), the five pages in the middle, account on the left. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="shell flex h-16 items-center justify-between gap-4 md:h-20">
        <div className="flex items-center gap-1">
          <Suspense fallback={<span className="size-9 md:hidden" />}>
            <MobileNav />
          </Suspense>
          <Link href="/" aria-label="شلونك.com — الرئيسية" className="shrink-0">
            <Logo className="h-5 w-auto md:h-6" />
          </Link>
        </div>
        <Suspense fallback={<MainNavFallback />}>
          <MainNav />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-10 w-28 rounded-full" />}>
          <HeaderAccount />
        </Suspense>
      </div>
    </header>
  );
}
