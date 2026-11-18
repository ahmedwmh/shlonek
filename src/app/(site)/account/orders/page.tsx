import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireViewer } from "@/lib/auth/dal";
import { formatDateTime, formatIQD } from "@/lib/format";
import { orderStatusLabel } from "@/features/account/labels";
import { getMyOrders } from "@/features/account/queries";
import { EmptyState, SectionHeader, SectionSkeleton, StatusPill } from "@/features/account/components/section";

export const metadata: Metadata = { title: "طلباتي ومدفوعاتي" };

async function Orders() {
  const viewer = await requireViewer("/account/orders");
  const orders = await getMyOrders(viewer.id);
  const now = new Date();

  if (orders.length === 0) {
    return <EmptyState title="ما عندك طلبات بعد." href="/consultations" cta="تصفح الخدمات" />;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border-2 border-foreground">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-muted text-start">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-bold">
            <th>رقم الطلب</th>
            <th>المنتج</th>
            <th>المبلغ</th>
            <th>طريقة الدفع</th>
            <th>التاريخ</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((o) => {
            // An unpaid order past its deadline is shown as expired right away
            // (the cleanup job settles it in the database a few minutes later).
            const lapsed = o.status === "AWAITING_PAYMENT" && o.expiresAt != null && o.expiresAt < now;
            const status = lapsed ? "EXPIRED" : o.status;
            const open = status === "AWAITING_PAYMENT" || status === "VERIFYING";
            const method =
              o.walletAmount && o.gatewayAmount ? "محفظة + Wayl" : o.gatewayAmount ? "Wayl" : o.walletAmount ? "محفظة" : "—";
            return (
              <tr key={o.id} className="[&>td]:px-4 [&>td]:py-3">
                <td className="font-bold tabular-nums">
                  <Link href={open ? `/checkout/${o.id}` : `/checkout/${o.id}/result`} className="underline-offset-4 hover:underline">
                    #{o.number}
                  </Link>
                </td>
                <td>{o.title}</td>
                <td className="whitespace-nowrap">
                  {formatIQD(o.total)}
                  {o.discount > 0 && <span className="block text-xs text-muted-foreground">خصم {formatIQD(o.discount)}</span>}
                </td>
                <td>{method}</td>
                <td className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                <td>
                  <StatusPill tone={status === "PAID" ? "solid" : open ? "neutral" : "muted"}>{orderStatusLabel[status]}</StatusPill>
                  {o.refunds.length > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      استرداد {formatIQD(o.refunds.reduce((n, r) => n + r.amount, 0))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <>
      <SectionHeader title="طلباتي ومدفوعاتي" description="كل الطلبات بالدينار العراقي." />
      <Suspense fallback={<SectionSkeleton />}>
        <Orders />
      </Suspense>
    </>
  );
}
