import type { Metadata } from "next";
import { Suspense } from "react";
import { requireViewer } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getMyPosts } from "@/features/posts/queries";
import { publicPostStatusLabel } from "@/features/account/labels";
import { WithdrawConsentButton } from "@/features/posts/components/withdraw-consent-button";
import { EmptyState, SectionHeader, SectionSkeleton, StatusPill } from "@/features/account/components/section";

export const metadata: Metadata = { title: "مشاركاتي" };

async function Posts() {
  const viewer = await requireViewer("/account/posts");
  const posts = await getMyPosts(viewer.id);

  if (posts.length === 0) {
    return <EmptyState title="ما كتبت بـ«احچيلي» بعد." href="/?tell=1" cta="احچيلي" character="helpful" />;
  }

  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => {
        const publicStatus = post.publicPost?.status;
        const canWithdraw = post.publishConsent && !post.consentWithdrawnAt && publicStatus !== "HIDDEN";
        return (
          <li key={post.id} className="sketch-card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{formatDateTime(post.createdAt)}</span>
              {post.consentWithdrawnAt ? (
                <StatusPill tone="muted">سحبت موافقة النشر</StatusPill>
              ) : publicStatus ? (
                <StatusPill tone={publicStatus === "PUBLISHED" ? "solid" : "neutral"}>{publicPostStatusLabel[publicStatus]}</StatusPill>
              ) : (
                <StatusPill tone="muted">خاصة</StatusPill>
              )}
            </div>
            <p className="leading-8 whitespace-pre-line">{post.body}</p>
            {canWithdraw && (
              <div className="flex justify-end">
                <WithdrawConsentButton postId={post.id} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function MyPostsPage() {
  return (
    <>
      <SectionHeader title="مشاركاتي" description="نصوصك الخاصة. ما ينعرض شي للعامة إلا بموافقتك وبعد المراجعة وبدون اسمك." />
      <Suspense fallback={<SectionSkeleton />}>
        <Posts />
      </Suspense>
    </>
  );
}
