import "server-only";
import { adminNotifyEmails } from "@/lib/env";
import { sendEmail } from "@/lib/email";

/**
 * Emails the team when a member writes in «احچيلي». By design the email carries
 * NO message text or member details — only a link to the inbox, which requires
 * staff sign-in. (Email is not a safe place for private feelings.)
 */
export async function notifyAdminsOfNewPost({ postId, publishConsent }: { postId: string; publishConsent: boolean }) {
  if (adminNotifyEmails.length === 0) return;
  await sendEmail({
    to: adminNotifyEmails,
    subject: "رسالة جديدة بـ«احچيلي»",
    heading: "وصلت رسالة جديدة",
    body: publishConsent
      ? "عضو كتب رسالة جديدة بـ«احچيلي» ووافق على نشرها بدون هوية بعد المراجعة. افتح صندوق احچيلي حتى تقراها وتراجع النسخة العامة."
      : "عضو كتب رسالة جديدة بـ«احچيلي». افتح صندوق احچيلي حتى تقراها وتتابعها.",
    ctaLabel: "افتح الرسالة",
    ctaPath: `/admin/inbox/${postId}`,
  });
}
