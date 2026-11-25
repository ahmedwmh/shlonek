/** Versioned cover URL: a new upload bumps `version`, so the old URL can be cached for a year. */
export const coverSrc = (slug: string, version: number) => `/courses/${encodeURIComponent(slug)}/cover?v=${version}`;

/** Page URLs with Arabic slugs, encoded once in one place. */
export const coursePath = (slug: string) => `/courses/${encodeURIComponent(slug)}`;
export const lessonPath = (slug: string, lessonId: string) => `${coursePath(slug)}/learn/${lessonId}`;

/** Event the action card dispatches to start the page's main player. */
export const PLAY_EVENT = "shlonek:play";
/** Event the player dispatches once a video is actually playing (detail = lessonId). */
export const PLAYING_EVENT = "shlonek:playing";

/** Arabic slugs may arrive percent-encoded in route params; the database stores them decoded. */
export function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
