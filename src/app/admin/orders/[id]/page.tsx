import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { features } from "@/lib/env";
import { formatDateTime, formatIQD } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { getOrderAdmin } from "@/features/admin/orders/queries";
import { CompleteRefundButton, OrderActions } from "@/features/admin/orders/components/order-actions";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section, TableScroll } from "@/features/admin/shared/components/section";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { bookingStatus, orderKind, orderStatus, refundStatus, walletTxType } from "@/features/admin/shared/labels";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}

async function OrderDetail({ params }: PageProps<"/admin/orders/[id]">) {
  await requireStaff();
  const { id } = await params;
  const o = await getOrderAdmin(id);
  if (!o) notFound();

  const active = o.refunds.filter((r) => r.status !== "REJECTED");
  const refunded = active.reduce((s, r) => s + r.amount, 0);
  const gatewayRefunded = active.filter((r) => r.method === "GATEWAY").reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader
        title={`طلب #${o.number}`}
        description={`${orderKind[o.kind]} · ${o.title}`}
        back={{ href: "/admin/orders", label: "الطلبات" }}
        actions={
          <>
            <StatusBadge map={orderStatus} value={o.status} />
            <OrderActions
              orderId={o.id}
              status={o.status}
              refundable={Math.max(0, o.total - refunded)}
              gatewayRefundable={Math.max(0, o.gatewayAmount - gatewayRefunded)}
              waylEnabled={features.wayl}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="التفاصيل">
          <dl className="divide-y text-sm">
            <Row label="العضو">
              <Link href={`/admin/members/${o.user.id}`} className="font-semibold hover:underline">
                {o.user.name}
              </Link>
            </Row>
            <Row label="السعر">{formatIQD(o.subtotal)}</Row>
            {o.discount > 0 && <Row label="الخصم">{formatIQD(o.discount)}</Row>}
            <Row label="الإجمالي">
              <span className="font-bold">{formatIQD(o.total)}</span>
            </Row>
            <Row label="من المحفظة">{formatIQD(o.walletAmount)}</Row>
            <Row label="عبر Wayl">{formatIQD(o.gatewayAmount)}</Row>
            {o.walletHeld && <Row label="رصيد محجوز">نعم، لحين تأكيد Wayl</Row>}
            {o.waylReferenceId && (
              <Row label="مرجع Wayl">
                <span dir="ltr" className="font-mono text-xs">
                  {o.waylReferenceId}
                </span>
              </Row>
            )}
            {o.waylStatus && <Row label="حالة Wayl">{o.waylStatus}</Row>}
            <Row label="أنشئ">{formatDateTime(o.createdAt)}</Row>
            {o.expiresAt && <Row label="مهلة الدفع">{formatDateTime(o.expiresAt)}</Row>}
            {o.paidAt && <Row label="دُفع">{formatDateTime(o.paidAt)}</Row>}
          </dl>
        </Section>

        <Section title="اللي انشرى">
          {o.consultation ? (
            <ul className="divide-y text-sm">
              {o.consultation.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {o.consultation!.sessionsCount > 1 && `الجلسة ${b.sequence} · `}
                    {formatDateTime(b.startsAt)}
                  </span>
                  <StatusBadge map={bookingStatus} value={b.status} />
                </li>
              ))}
            </ul>
          ) : o.premiumPlan ? (
            <div className="text-sm">
              <p className="font-semibold">
                بريميوم — {o.premiumPlan.name} ({o.premiumPlan.durationDays} يوم)
              </p>
              {o.premiumPeriod ? (
                <p className="mt-1 text-muted-foreground">
                  {formatDateTime(o.premiumPeriod.startsAt)} ← {formatDateTime(o.premiumPeriod.endsAt)}
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground">ما تفعّل بعد.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </Section>
      </div>

      <Section title="الاستردادات" className="mt-4">
        {o.refunds.length === 0 ? (
          <p className="text-sm text-muted-foreground">ما كو استردادات.</p>
        ) : (
          <TableScroll>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الطريقة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>السبب</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums whitespace-nowrap">{formatIQD(r.amount)}</TableCell>
                    <TableCell>{r.method === "WALLET" ? "محفظة" : "Wayl"}</TableCell>
                    <TableCell>
                      <StatusBadge map={refundStatus} value={r.status} />
                    </TableCell>
                    <TableCell className="max-w-64 truncate">{r.reason}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell>{r.status === "REQUESTED" && r.method === "GATEWAY" && <CompleteRefundButton refundId={r.id} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="حركات المحفظة">
          {o.walletTxs.length === 0 ? (
            <p className="text-sm text-muted-foreground">ما كو.</p>
          ) : (
            <ul className="divide-y text-sm">
              {o.walletTxs.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <span>{walletTxType[t.type]}</span>
                  <span dir="ltr" className={`tabular-nums ${t.amount < 0 ? "text-destructive" : ""}`}>
                    {t.amount > 0 ? "+" : ""}
                    {t.amount.toLocaleString("en-US")}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="أحداث الدفع (Wayl)">
          {o.paymentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">ما كو.</p>
          ) : (
            <ul className="divide-y text-sm">
              {o.paymentEvents.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-2 py-2">
                  <span dir="ltr">{ev.status ?? "—"}</span>
                  <span className={ev.signatureValid ? "text-success" : "text-destructive"}>
                    {ev.signatureValid ? "توقيع صحيح" : "توقيع غير صحيح"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(ev.receivedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

export default function OrderAdminPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetail {...props} />
    </Suspense>
  );
}
