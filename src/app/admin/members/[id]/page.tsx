import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CrownIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatIQD, formatShortDate } from "@/lib/format";
import { getViewer, requireStaff } from "@/lib/auth/dal";
import { getMemberFile } from "@/features/admin/members/queries";
import {
  EndPremium,
  GrantPremium,
  MemberNoteForm,
  RoleSelect,
  WalletActions,
} from "@/features/admin/members/components/member-actions";
import { AttemptsCompare } from "@/features/admin/members/components/attempts-compare";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { InfoList, Section, TableScroll } from "@/features/admin/shared/components/section";
import { Pill, StatusBadge } from "@/features/admin/shared/components/status-badge";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { segmentedTabs } from "@/features/admin/shared/components/tabs-style";
import {
  bookingStatus,
  orderKind,
  orderStatus,
  privatePostStatus,
  roleLabel,
  walletTxType,
} from "@/features/admin/shared/labels";

type Period = NonNullable<Awaited<ReturnType<typeof getMemberFile>>>["premiumPeriods"][number];

/** One premium period: title + length on the first line, dates below, state + end action at the end. */
function PeriodRow({ period: p, now, canEnd }: { period: Period; now: Date; canEnd: boolean }) {
  const days = Math.round((p.endsAt.getTime() - p.startsAt.getTime()) / 86_400_000);
  const state = p.endedEarlyAt
    ? { label: days < 1 ? "ملغاة" : "انتهت مبكراً", tone: "secondary" as const }
    : p.startsAt > now
      ? { label: "قادمة", tone: "outline" as const }
      : p.endsAt > now
        ? { label: "فعّالة", tone: "default" as const }
        : { label: "منتهية", tone: "secondary" as const };
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">
          {p.plan?.name ?? "تفعيل يدوي"}
          {days >= 1 && <span className="font-normal text-muted-foreground"> · {days} يوم</span>}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {formatShortDate(p.startsAt)} ← {formatShortDate(p.endsAt)}
          {p.note ? ` · ${p.note}` : ""}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Pill tone={state.tone}>{state.label}</Pill>
        {canEnd && p.endsAt > now && !p.endedEarlyAt && <EndPremium periodId={p.id} />}
      </div>
    </li>
  );
}

async function MemberFile({ params }: PageProps<"/admin/members/[id]">) {
  await requireStaff();
  const viewer = await getViewer();
  const isAdmin = viewer?.role === "ADMIN";
  const { id } = await params;
  const m = await getMemberFile(id);
  if (!m) notFound();

  const now = new Date();
  const activePremium = m.premiumPeriods.find((p) => p.startsAt <= now && p.endsAt > now);
  const coveredUntil = m.premiumPeriods.find((p) => p.endsAt > now)?.endsAt;
  const balance = m.wallet?.balance ?? 0;
  const held = m.wallet?.held ?? 0;

  // Group attempts by exercise for the comparison view.
  const byExercise = new Map<string, { title: string; attempts: typeof m.attempts }>();
  for (const a of m.attempts) {
    const entry = byExercise.get(a.exercise.id) ?? { title: a.exercise.title, attempts: [] };
    entry.attempts.push(a);
    byExercise.set(a.exercise.id, entry);
  }

  const periods = m.premiumPeriods;
  const shownPeriods = periods.slice(0, 3);
  const morePeriods = periods.slice(3);

  return (
    <>
      <PageHeader
        title={m.name}
        leading={
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-foreground text-xl font-extrabold text-background">
            {m.name.slice(0, 1)}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span dir="ltr">{m.email}</span>
            {m.phone && (
              <span dir="ltr" className="tabular-nums">
                {m.phone}
              </span>
            )}
            <span>انضم {formatShortDate(m.createdAt)}</span>
            {activePremium && (
              <Pill tone="default">
                <CrownIcon className="size-3.5" strokeWidth={2.5} /> بريميوم
              </Pill>
            )}
          </span>
        }
        back={{ href: "/admin/members", label: "الأعضاء" }}
        actions={isAdmin ? <RoleSelect userId={m.id} role={m.role} /> : <Pill>{roleLabel[m.role]}</Pill>}
      />

      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Wallet */}
        <Section fill title="المحفظة" description="رصيد يستخدمه العضو لأي خدمة بالموقع." footer={isAdmin ? <WalletActions userId={m.id} /> : undefined}>
          <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
            <span className="text-sm text-muted-foreground">الرصيد المتاح</span>
            <span className="text-4xl font-extrabold tabular-nums">{formatIQD(balance - held)}</span>
            {held > 0 && (
              <span className="mt-1 text-sm text-muted-foreground">
                + {formatIQD(held)} محجوزة لدفع قيد التحقق
              </span>
            )}
          </div>
        </Section>

        {/* Premium */}
        <Section fill title="بريميوم" footer={isAdmin ? <GrantPremium userId={m.id} /> : undefined}>
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-full ${coveredUntil ? "bg-foreground text-background" : "bg-background text-muted-foreground"}`}
            >
              <CrownIcon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="font-bold">{activePremium ? "مشترك حالياً" : coveredUntil ? "اشتراك قادم" : "غير مشترك"}</span>
              <span className="text-sm text-muted-foreground">
                {coveredUntil ? `لحد ${formatShortDate(coveredUntil)}` : "ما عنده مدة فعّالة"}
              </span>
            </div>
          </div>
          {periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">ما كو سجل اشتراكات.</p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border/60">
                {shownPeriods.map((p) => (
                  <PeriodRow key={p.id} period={p} now={now} canEnd={isAdmin} />
                ))}
              </ul>
              {morePeriods.length > 0 && (
                <details className="group mt-1">
                  <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                    <span className="group-open:hidden">عرض الكل ({periods.length})</span>
                    <span className="hidden group-open:inline">إخفاء</span>
                  </summary>
                  <ul className="flex flex-col divide-y divide-border/60">
                    {morePeriods.map((p) => (
                      <PeriodRow key={p.id} period={p} now={now} canEnd={isAdmin} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </Section>

        {/* Info */}
        <Section fill title="معلومات" className="md:col-span-2 xl:col-span-1">
          <InfoList
            items={[
              { label: "انضم", value: formatShortDate(m.createdAt) },
              { label: "الصلاحية", value: roleLabel[m.role] },
              { label: "الشروط", value: m.termsVersion ? `إصدار ${m.termsVersion}` : "لم يوافق بعد" },
              {
                label: "التواصل المفضّل",
                value: [m.contactByEmail && "بريد", m.contactByPhone && "هاتف"].filter(Boolean).join("، ") || "—",
              },
              { label: "التمارين", value: `${m.attempts.length} محاولة` },
              ...(m.deletionRequestedAt
                ? [{ label: "طلب حذف الحساب", value: formatShortDate(m.deletionRequestedAt), tone: "danger" as const }]
                : []),
            ]}
          />
        </Section>
      </div>

      <Tabs defaultValue="exercises" className="mt-8" dir="rtl">
        <TabsList className={segmentedTabs.list}>
          {[
            ["exercises", "التمارين", m.attempts.length],
            ["consultations", "الاستشارات", m.purchases.length],
            ["orders", "الطلبات", m.orders.length],
            ["wallet", "سجل المحفظة", m.wallet?.transactions.length ?? 0],
            ["posts", "الرسائل", m.privatePosts.length],
            ["notes", "ملاحظات", m.staffNotes.length],
          ].map(([value, label, count]) => (
            <TabsTrigger
              key={value as string}
              value={value as string}
              className={segmentedTabs.trigger}
            >
              {label}
              <span className={segmentedTabs.count}>{count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="exercises" className="mt-5 flex flex-col gap-4">
          {byExercise.size === 0 ? (
            <EmptyState title="ما سوّى أي تمرين بعد" />
          ) : (
            [...byExercise.entries()].map(([exId, group]) => (
              <Section key={exId} title={group.title} description={`${group.attempts.length} محاولة`}>
                <AttemptsCompare attempts={group.attempts} />
              </Section>
            ))
          )}
        </TabsContent>

        <TabsContent value="consultations" className="mt-5 flex flex-col gap-4">
          {m.purchases.length === 0 ? (
            <EmptyState title="ما عنده حجوزات" />
          ) : (
            m.purchases.map((p) => (
              <Section
                key={p.id}
                title={p.service.title}
                actions={
                  <Link href={`/admin/orders/${p.order.id}`} className="text-sm hover:underline">
                    طلب #{p.order.number} · <StatusBadge map={orderStatus} value={p.order.status} />
                  </Link>
                }
              >
                <ul className="divide-y text-sm">
                  {p.bookings.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>
                        {p.sessionsCount > 1 && `الجلسة ${b.sequence} · `}
                        {formatDateTime(b.startsAt)}
                      </span>
                      <StatusBadge map={bookingStatus} value={b.status} />
                    </li>
                  ))}
                </ul>
              </Section>
            ))
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-5">
          {m.orders.length === 0 ? (
            <EmptyState title="ما كو طلبات" />
          ) : (
            <TableScroll>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                          {o.number}
                        </Link>
                      </TableCell>
                      <TableCell>{orderKind[o.kind]}</TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">{formatIQD(o.total)}</TableCell>
                      <TableCell>
                        <StatusBadge map={orderStatus} value={o.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatShortDate(o.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScroll>
          )}
        </TabsContent>

        <TabsContent value="wallet" className="mt-5">
          {!m.wallet?.transactions.length ? (
            <EmptyState title="ما كو حركات بالمحفظة" />
          ) : (
            <TableScroll>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الرصيد بعدها</TableHead>
                    <TableHead>ملاحظة</TableHead>
                    <TableHead>بواسطة</TableHead>
                    <TableHead>الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.wallet.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{walletTxType[t.type]}</TableCell>
                      <TableCell dir="ltr" className={`text-end tabular-nums ${t.amount < 0 ? "text-destructive" : ""}`}>
                        {t.amount > 0 ? "+" : ""}
                        {t.amount.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatIQD(t.balanceAfter)}</TableCell>
                      <TableCell className="max-w-56 truncate">
                        {t.order ? (
                          <Link href={`/admin/orders/${t.order.id}`} className="hover:underline">
                            #{t.order.number}{" "}
                          </Link>
                        ) : null}
                        {t.note}
                      </TableCell>
                      <TableCell>{t.actor?.name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScroll>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-5">
          {m.privatePosts.length === 0 ? (
            <EmptyState title="ما أرسل رسائل" />
          ) : (
            <ul className="flex flex-col gap-2">
              {m.privatePosts.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/inbox/${p.id}`} className="flex items-center gap-3 rounded-xl border p-3 hover:border-foreground">
                    <span className="line-clamp-1 flex-1">{p.body}</span>
                    <StatusBadge map={privatePostStatus} value={p.status} />
                    <span className="text-xs whitespace-nowrap text-muted-foreground">{formatShortDate(p.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-5">
          <Section title="ملاحظات المتابعة" description="خاصة بالفريق، ما تختلط بإجابات العضو ولا تغيّر نتائجه.">
            <MemberNoteForm userId={m.id} />
            <ul className="mt-4 flex flex-col gap-3">
              {m.staffNotes.map((n) => (
                <li key={n.id} className="rounded-xl bg-muted p-3 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.author.name} · {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function MemberPage(props: PageProps<"/admin/members/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MemberFile {...props} />
    </Suspense>
  );
}
