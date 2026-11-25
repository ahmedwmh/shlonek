import { decodeSlug } from "@/features/courses/cover";
import { getUploadedCover, getYouTubeCoverId } from "@/features/courses/queries";

/**
 * Course cover: the uploaded image, else the first YouTube video's thumbnail
 * (proxied so pages never expose a video id), else a neutral placeholder.
 * Links carry `?v=<coverVersion>`, so a versioned response can be cached for a
 * year; any upload or lesson change bumps the version.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeSlug((await params).slug);
  const versioned = new URL(request.url).searchParams.has("v");
  const cache = versioned ? "public, max-age=31536000, immutable" : "public, max-age=600, stale-while-revalidate=86400";

  const uploaded = await getUploadedCover(slug);
  if (uploaded) return image(new Uint8Array(uploaded.data), uploaded.contentType, cache);

  const youtube = await getYouTubeCoverId(slug);
  if (youtube) {
    // hq720 is 16:9 without letterbox bars; older videos only have hqdefault.
    for (const name of ["hq720", "hqdefault"]) {
      try {
        const res = await fetch(`https://i.ytimg.com/vi/${encodeURIComponent(youtube)}/${name}.jpg`, { signal: AbortSignal.timeout(8_000) });
        const type = res.headers.get("content-type") ?? "";
        if (res.ok && type.startsWith("image/")) return image(new Uint8Array(await res.arrayBuffer()), type, cache);
      } catch {
        // try the next size
      }
    }
  }

  // Neutral placeholder (no play icon: the player draws its own controls on top).
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset="1" stop-color="#e2e2e2"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><text x="80" y="52" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#c4c4c4" text-anchor="middle">shlonek</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
}

function image(bytes: Uint8Array, type: string, cache: string) {
  return new Response(new Blob([bytes as BlobPart], { type }), {
    headers: { "Content-Type": type, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" },
  });
}
