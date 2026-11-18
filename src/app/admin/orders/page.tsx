import { Suspense } from "react";
import Link from "next/link";
import { ReceiptIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatIQD } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { listOrders } from "@/features/admin/orders/queries";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { TableScroll } from "@/features/admin/shared/components/section";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { UrlFilters } from "@/features/admin/shared/components/url-filters";
import { orderKind, orderStatus } from "@/features/admin/shared/labels";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function paidWith(o: { walletAmount: number; gatewayAmount: number; status: string }) {
  if (o.walletAmount && o.gatewayAmount) return "محفظة + Wayl";
  if (o.gatewayAmount) return "Wayl";
  if (o.walletAmount) return "محفظة";
  return "—";
}

async function Orders({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff();
  const sp = await searchParams;
  const orders = await listOrders({ status: first(sp.status), q: first(sp.q) });

  return (
    <>
      <UrlFilters
        search={{ name: "q", placeholder: "رقم الطلب، اسم أو بريد" }}
        selects={[{ name: "status", label: "الحالة", options: Object.entries(orderStatus).map(([value, l]) => ({ value, label: l.label })) }]}
      />
      {orders.length === 0 ? (
        <EmptyState title="ما كو طلبات" icon={ReceiptIcon} />
      ) : (
        <TableScroll>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>العضو</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                      {o.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/members/${o.user.id}`} className="hover:underline">
                      {o.user.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">{orderKind[o.kind]} · </span>
                    {o.title}
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">{formatIQD(o.total)}</TableCell>
                  <TableCell className="whitespace-nowrap">{paidWith(o)}</TableCell>
                  <TableCell>
                    <StatusBadge map={orderStatus} value={o.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      )}
    </>
  );
}

export default function OrdersAdminPage(props: PageProps<"/admin/orders">) {
  return (
    <>
      <PageHeader title="الطلبات والمدفوعات" description="كل طلب بسعره المثبّت، طريقة دفعه، أحداث الدفع والاستردادات." />
      <Suspense fallback={<PageSkeleton />}>
        <Orders {...props} />
      </Suspense>
    </>
  );
}
