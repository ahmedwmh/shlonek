import { Suspense } from "react";
import Link from "next/link";
import { InboxIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelative } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { listInbox } from "@/features/admin/inbox/queries";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { TableScroll } from "@/features/admin/shared/components/section";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { UrlFilters } from "@/features/admin/shared/components/url-filters";
import { privatePostStatus, publicPostStatus } from "@/features/admin/shared/labels";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Inbox({ searchParams }: PageProps<"/admin/inbox">) {
  await requireStaff();
  const sp = await searchParams;
  const posts = await listInbox({ status: first(sp.status), publicStatus: first(sp.public), q: first(sp.q) });
  const now = new Date();

  return (
    <>
      <UrlFilters
        search={{ name: "q", placeholder: "ابحث باسم العضو أو بريده" }}
        selects={[
          { name: "status", label: "المتابعة", options: Object.entries(privatePostStatus).map(([value, l]) => ({ value, label: l.label })) },
          { name: "public", label: "النشر", options: Object.entries(publicPostStatus).map(([value, l]) => ({ value, label: l.label })) },
        ]}
      />
      {posts.length === 0 ? (
        <EmptyState title="ما كو رسائل بهالفلتر" icon={InboxIcon} />
      ) : (
        <TableScroll>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العضو</TableHead>
                <TableHead>الرسالة</TableHead>
                <TableHead>المتابعة</TableHead>
                <TableHead>النشر</TableHead>
                <TableHead>الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id} className={p.status === "NEW" ? "font-semibold" : undefined}>
                  <TableCell className="whitespace-nowrap">{p.user.name}</TableCell>
                  <TableCell className="max-w-md">
                    <Link href={`/admin/inbox/${p.id}`} className="line-clamp-1 break-all hover:underline">
                      {p.body}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={privatePostStatus} value={p.status} />
                  </TableCell>
                  <TableCell>
                    {p.publicPost ? (
                      <StatusBadge map={publicPostStatus} value={p.publicPost.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">خاص</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatRelative(p.createdAt, now)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      )}
    </>
  );
}

export default function InboxPage(props: PageProps<"/admin/inbox">) {
  return (
    <>
      <PageHeader title="صندوق احچيلي" description="كل رسالة توصل من الأعضاء، خاصة ومرتبطة بحساب صاحبها." />
      <Suspense fallback={<PageSkeleton />}>
        <Inbox {...props} />
      </Suspense>
    </>
  );
}
