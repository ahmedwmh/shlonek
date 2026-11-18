import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountNav } from "@/features/account/components/account-nav";

export const metadata: Metadata = { title: { default: "حسابي", template: "%s · حسابي" }, robots: { index: false } };

/** حسابي — one place for results, bookings, purchases and posts. Data always comes from the account, not the device. */
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="shell py-8 md:py-12">
      <h1 className="mb-6 text-3xl font-bold">حسابي</h1>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<div className="h-10 lg:h-80" />}>
            <AccountNav />
          </Suspense>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
