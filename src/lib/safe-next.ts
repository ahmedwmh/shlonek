/** Only allow same-site relative redirects (blocks `//evil.com` and absolute URLs). */
export function safeNext(next: unknown, fallback = "/") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
