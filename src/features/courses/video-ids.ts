/**
 * Video id helpers shared by admin forms (client) and server validation.
 * Admins may paste a full link; we store only the id.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts youtu.be/…, youtube.com/watch?v=…, /live/…, /shorts/…, /embed/… or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    if (!id) {
      const [, section, candidate] = url.pathname.split("/");
      if (section && ["live", "shorts", "embed", "v"].includes(section)) id = candidate ?? null;
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** VdoCipher ids are opaque hex-like strings; we only sanity-check the shape. */
export function parseVdoCipherId(input: string): string | null {
  const value = input.trim();
  return /^[A-Za-z0-9]{8,64}$/.test(value) ? value : null;
}
