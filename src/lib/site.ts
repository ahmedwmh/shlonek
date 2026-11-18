/** Public site identity, shared by metadata, sitemap, robots and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "شلونك.com";
export const SITE_DESCRIPTION = "منصة لايف كوتشينج تفاعلية تساعدك تعرف نفسك، تختار بوعي، وتعيش حياتك.";

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
