import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { MailIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrivatePostStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { getInboxPost } from "@/features/admin/inbox/queries";
import { PostStatusSelect } from "@/features/admin/inbox/components/post-status-select";
import { InboxNoteForm } from "@/features/admin/inbox/components/inbox-note-form";
import { PublicPostPanel } from "@/features/admin/inbox/components/public-post-panel";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { InfoList, Section } from "@/features/admin/shared/components/section";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { publicPostStatus } from "@/features/admin/shared/labels";

async function PostDetail({ params }: PageProps<"/admin/inbox/[id]">) {
  await requireStaff();
  const { id } = await params;
  const post = await getInboxPost(id);
  if (!post) notFound();

  // Opening a new message marks it read (after the response is sent).
  if (post.status === PrivatePostStatus.NEW) {
    after(() => db.privatePost.updateMany({ where: { id, status: PrivatePostStatus.NEW }, data: { status: PrivatePostStatus.READ } }));
  }

  const canPublish = post.publishConsent && !post.consentWithdrawnAt;

  return (
    <>
      <PageHeader
        title={`رسالة من ${post.user.name}`}
        leading={
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-foreground text-lg font-extrabold text-background">
            {post.user.name.slice(0, 1)}
          </span>
        }
        description={formatDateTime(post.createdAt)}
        back={{ href: "/admin/inbox", label: "صندوق احچيلي" }}
        actions={<PostStatusSelect id={post.id} status={post.status === "NEW" ? "READ" : post.status} />}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title="النص الأصلي" description="خاص بالفريق، ما ينعرض للعامة.">
            <blockquote className="rounded-xl border-s-4 border-foreground bg-muted/50 p-4 text-[0.95rem] leading-8 break-words whitespace-pre-line">
              {post.body}
            </blockquote>
          </Section>

          {post.publicPost ? (
            <Section
              title="النسخة العامة"
              description={
                post.consentWithdrawnAt ? `سحب الموافقة ${formatDateTime(post.consentWithdrawnAt)}` : "صاحب الرسالة وافق على النشر بدون هوية."
              }
              actions={<StatusBadge map={publicPostStatus} value={post.publicPost.status} />}
            >
              <PublicPostPanel
                postId={post.id}
                text={post.publicPost.text}
                status={post.publicPost.status}
                canPublish={canPublish}
              />
              {post.publicPost.rejectionReason && (
                <p className="mt-3 text-sm text-muted-foreground">سبب الرفض: {post.publicPost.rejectionReason}</p>
              )}
            </Section>
          ) : (
            <Section title="النسخة العامة">
              <p className="text-sm text-muted-foreground">صاحب الرسالة ما وافق على النشر، فتبقى خاصة.</p>
            </Section>
          )}

          <Section title="ملاحظات الفريق" description="داخلية فقط، ما يشوفها العضو.">
            <InboxNoteForm postId={post.id} />
            <ul className="mt-4 flex flex-col gap-3">
              {post.notes.map((n) => (
                <li key={n.id} className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.author.name} · {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Section title="التواصل">
            <InfoList
              items={[
                { label: "الاسم", value: post.user.name },
                { label: "البريد", value: <span dir="ltr">{post.user.email}</span> },
                ...(post.user.phone ? [{ label: "الهاتف", value: <span dir="ltr">{post.user.phone}</span> }] : []),
              ]}
            />
            <div className="mt-5 grid gap-2">
              <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                <a href={`mailto:${post.user.email}`}>
                  <MailIcon /> فتح البريد
                </a>
              </Button>
              {post.user.phone && (
                <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                  <a href={`tel:${post.user.phone}`}>
                    <PhoneIcon /> اتصال
                  </a>
                </Button>
              )}
            </div>
            <Button asChild className="mt-2 h-10 w-full rounded-xl">
              <Link href={`/admin/members/${post.user.id}`}>فتح ملف العضو</Link>
            </Button>
          </Section>
        </aside>
      </div>
    </>
  );
}

export default function InboxPostPage(props: PageProps<"/admin/inbox/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PostDetail {...props} />
    </Suspense>
  );
}
