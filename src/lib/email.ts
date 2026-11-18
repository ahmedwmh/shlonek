import "server-only";
import { env, features } from "@/lib/env";

/**
 * Transactional email. Messages never include post text or exercise answers —
 * only a short notice and a link that requires sign-in.
 */
type Email = { to: string | string[]; subject: string; heading: string; body: string; ctaLabel?: string; ctaPath?: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function render({ heading, body, ctaLabel, ctaPath }: Email) {
  const cta =
    ctaLabel && ctaPath
      ? `<p style="margin:28px 0"><a href="${env.NEXT_PUBLIC_SITE_URL}${encodeURI(ctaPath)}" style="background:#111;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">${escapeHtml(ctaLabel)}</a></p>`
      : "";
  return `<!doctype html><html dir="rtl" lang="ar"><body style="font-family:Tahoma,Arial,sans-serif;background:#fff;color:#111;padding:32px">
  <h1 style="font-size:20px">${escapeHtml(heading)}</h1><p style="font-size:15px;line-height:1.8">${escapeHtml(body)}</p>${cta}
  <p style="color:#888;font-size:12px;margin-top:40px">شلونك.com</p></body></html>`;
}

export async function sendEmail(email: Email) {
  if (!features.email) {
    console.info(`[email:dev] to=${[email.to].flat().join(",")} subject="${email.subject}"`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: email.to, subject: email.subject, html: render(email) }),
      // Never let a slow provider keep a request (or an after() callback) alive.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email] send failed", res.status);
  } catch (error) {
    // Email must never break the flow that triggered it.
    console.error("[email] send error", error);
  }
}
