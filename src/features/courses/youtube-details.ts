/**
 * Title, description, length and channel of a YouTube video (unlisted works),
 * shaped into course fields so admins don't retype what's already on YouTube.
 * No API key: reads the public watch page, falls back to oEmbed for the title.
 * Plain module (no secrets) so the seed script can use it too.
 */

export type YouTubeDetails = {
  videoId: string;
  title: string;
  presenter: string | null;
  summary: string;
  description: string;
  topics: string[];
  durationMinutes: number | null;
};

type Raw = { title?: string; author?: string; shortDescription?: string; lengthSeconds?: string };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

async function fetchRaw(videoId: string): Promise<Raw | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=ar`, {
      headers: { "Accept-Language": "ar,en;q=0.8", "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});(?:var|<\/script>)/);
      const details = match ? (JSON.parse(match[1]) as { videoDetails?: Raw }).videoDetails : undefined;
      if (details?.title) return details;
    }
  } catch {
    // fall through to oEmbed
  }
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const o = (await res.json()) as { title?: string; author_name?: string };
    return o.title ? { title: o.title, author: o.author_name } : null;
  } catch {
    return null;
  }
}

const tidy = (s: string) =>
  s
    .replace(/[ \t]+/g, " ")
    .replace(/ ([؟?!.,،:])/g, "$1")
    .trim();

/** Bullet lines become topics; the line introducing them ("…محاور الورشة:") is dropped. */
export function shapeDetails(videoId: string, raw: Raw): YouTubeDetails {
  const lines = (raw.shortDescription ?? "").replace(/\r/g, "").split("\n").map((l) => l.trim());
  const isBullet = (l: string) => /^[-•*–]\s+/.test(l);
  const topics = lines.filter(isBullet).map((l) => tidy(l.replace(/^[-•*–]\s+/, "").replace(/[.،]$/, ""))).filter(Boolean).slice(0, 20);
  const body = lines.filter((l, i) => !isBullet(l) && !(l.endsWith(":") && isBullet(lines[i + 1] ?? "") ) && !(l.endsWith(":") && lines[i + 1] === "" && isBullet(lines[i + 2] ?? "")));
  const description = tidy(body.join("\n").replace(/\n{3,}/g, "\n\n")).slice(0, 5000);

  const presenter = raw.author ? tidy(raw.author.split("|")[0]) || null : null;
  const firstParagraph = description.split(/\n\s*\n/)[0]?.replace(/\n/g, " ").trim() ?? "";
  const summary =
    firstParagraph.length >= 10
      ? firstParagraph.length > 280
        ? `${firstParagraph.slice(0, 277).replace(/\s+\S*$/, "")}…`
        : firstParagraph
      : `ورشة مسجّلة${presenter ? ` وياك ${presenter}` : ""}.`;
  const seconds = Number(raw.lengthSeconds);

  return {
    videoId,
    title: tidy(raw.title ?? "").slice(0, 120),
    presenter,
    summary,
    description,
    topics,
    durationMinutes: Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : null,
  };
}

export async function fetchYouTubeDetails(videoId: string): Promise<YouTubeDetails | null> {
  const raw = await fetchRaw(videoId);
  return raw ? shapeDetails(videoId, raw) : null;
}
