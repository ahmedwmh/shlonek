import "server-only";
import { z } from "zod";
import { env, features } from "@/lib/env";
import { SITE_URL } from "@/lib/site";

/**
 * VdoCipher playback (https://www.vdocipher.com/docs/server/playbackauth/otp).
 * A short-lived OTP is minted on the server per page view, only after the
 * access check passed; the browser never sees our API secret or a reusable link.
 */

const otpSchema = z.object({ otp: z.string().min(1), playbackInfo: z.string().min(1) });
export type VdoPlayback = z.infer<typeof otpSchema>;

/** Bare domain for VdoCipher's whitelist (covers subdomains). Skipped for localhost. */
function playbackDomain() {
  const host = new URL(SITE_URL).hostname.replace(/^www\./, "");
  return host === "localhost" || host === "127.0.0.1" ? undefined : host;
}

export async function getVdoCipherPlayback(input: {
  videoId: string;
  /** Null for the public intro video of a paid course. */
  viewer: { id: string; email: string } | null;
}): Promise<VdoPlayback | null> {
  if (!features.vdocipher) return null;
  const domain = playbackDomain();
  try {
    const res = await fetch(`https://dev.vdocipher.com/api/videos/${encodeURIComponent(input.videoId)}/otp`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Apisecret ${env.VDOCIPHER_API_SECRET}`,
      },
      body: JSON.stringify({
        // Enough for the player to load; a refresh mints a new one.
        ttl: 300,
        ...(input.viewer
          ? {
              // Our opaque user id (never email/phone, per VdoCipher's guidance) for viewer analytics.
              userId: input.viewer.id.slice(0, 36),
              // Moving watermark with the viewer's email: a recorded copy points back to its owner.
              annotate: JSON.stringify([
                { type: "rtext", text: input.viewer.email, alpha: "0.45", color: "0xFFFFFF", size: "13", interval: "5000" },
              ]),
            }
          : {}),
        ...(domain ? { whitelisthref: domain } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[vdocipher] otp failed", res.status);
      return null;
    }
    return otpSchema.parse(await res.json());
  } catch (error) {
    console.error("[vdocipher] otp error", error);
    return null;
  }
}
