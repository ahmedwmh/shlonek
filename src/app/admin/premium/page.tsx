import { Suspense } from "react";
import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIQD, formatShortDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { getPremiumAdmin } from "@/features/admin/premium/queries";
import { CreatePlanButton, PlanRowActions } from "@/features/admin/premium/components/plan-forms";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section, TableScroll } from "@/features/admin/shared/components/section";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";

async function Premium() {
  await requireStaff();
  const { plans, periods, now } = await getPremiumAdmin();

  return (
    <div className="flex flex-col gap-4">
      <Section title="الخطط" actions={<CreatePlanButton />}>
        {plans.length === 0 ? (
          <EmptyState title="ما كو خطط" icon={CrownIcon} />
        ) : (
          <TableScroll>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الخطة</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>مبيعات</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell>{p.durationDays} يوم</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">{formatIQD(p.price)}</TableCell>
                    <TableCell>{p.isActive ? <Badge>فعّالة</Badge> : <Badge variant="secondary">معطّلة</Badge>}</TableCell>
                    <TableCell className="tabular-nums">{p._count.periods}</TableCell>
                    <TableCell>
                      <PlanRowActions plan={p} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </Section>

      <Section title="المشتركين" description="المدد الفعّالة والقادمة.">
        {periods.length === 0 ? (
          <EmptyState title="ما كو مشتركين حالياً" icon={CrownIcon} />
        ) : (
          <TableScroll>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العضو</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>من</TableHead>
                  <TableHead>إلى</TableHead>
                  <TableHead>المصدر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/admin/members/${p.user.id}`} className="hover:underline">
                        {p.user.name}
                      </Link>
                    </TableCell>
                    <TableCell>{p.plan?.name ?? "تفعيل يدوي"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatShortDate(p.startsAt)}
                      {p.startsAt > now && <span className="ms-1 text-xs text-muted-foreground">(قادمة)</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatShortDate(p.endsAt)}</TableCell>
                    <TableCell>{p.grantedBy ? "يدوي" : "شراء"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </Section>
    </div>
  );
}

export default function PremiumAdminPage() {
  return (
    <>
      <PageHeader title="بريميوم" description="خطط بمدة ثابتة تنشرى مرة وحدة، بدون تجديد تلقائي." />
      <Suspense fallback={<PageSkeleton />}>
        <Premium />
      </Suspense>
    </>
  );
}
