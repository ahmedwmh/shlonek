import { Suspense } from "react";
import Link from "next/link";
import { CrownIcon, UsersIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIQD, formatShortDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { listMembers } from "@/features/admin/members/queries";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { TableScroll } from "@/features/admin/shared/components/section";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { UrlFilters } from "@/features/admin/shared/components/url-filters";
import { roleLabel } from "@/features/admin/shared/labels";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Members({ searchParams }: PageProps<"/admin/members">) {
  await requireStaff();
  const sp = await searchParams;
  const members = await listMembers({ q: first(sp.q), role: first(sp.role) });

  return (
    <>
      <UrlFilters
        search={{ name: "q", placeholder: "ابحث بالاسم، البريد أو الهاتف" }}
        selects={[{ name: "role", label: "الصلاحية", options: Object.entries(roleLabel).map(([value, label]) => ({ value, label })) }]}
      />
      {members.length === 0 ? (
        <EmptyState title="ما كو أعضاء بهالبحث" icon={UsersIcon} />
      ) : (
        <TableScroll>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العضو</TableHead>
                <TableHead>المحفظة</TableHead>
                <TableHead>بريميوم</TableHead>
                <TableHead>تمارين</TableHead>
                <TableHead>رسائل</TableHead>
                <TableHead>انضم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/admin/members/${m.id}`} className="flex flex-col hover:underline">
                      <span className="font-semibold">
                        {m.name}
                        {m.role !== "MEMBER" && <span className="ms-2 text-xs text-muted-foreground">({roleLabel[m.role]})</span>}
                      </span>
                      <span dir="ltr" className="text-end text-xs text-muted-foreground">
                        {m.email}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">{formatIQD(m.wallet?.balance ?? 0)}</TableCell>
                  <TableCell>
                    {m.premiumPeriods[0] ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <CrownIcon className="size-3.5" aria-label="بريميوم" />
                        حتى {formatShortDate(m.premiumPeriods[0].endsAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{m._count.attempts}</TableCell>
                  <TableCell className="tabular-nums">{m._count.privatePosts}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatShortDate(m.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      )}
    </>
  );
}

export default function MembersPage(props: PageProps<"/admin/members">) {
  return (
    <>
      <PageHeader title="الأعضاء" description="ملف كل عضو: محفظته، اشتراكه، تمارينه وحجوزاته." />
      <Suspense fallback={<PageSkeleton />}>
        <Members {...props} />
      </Suspense>
    </>
  );
}
