import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getPublishedExercises } from "@/features/exercises/queries";
import { getActiveServices } from "@/features/consultations/queries";
import { policySlugs } from "@/features/policies/queries";

/** Public pages only. Exercise and service URLs come from the (cached) catalog. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [exercises, services] = await Promise.all([getPublishedExercises(), getActiveServices()]);

  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/consultations"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/exercises"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/premium"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/courses"), changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...pages,
    ...exercises.map((e) => ({ url: absoluteUrl(`/exercises/${e.slug}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...services.map((s) => ({ url: absoluteUrl(`/consultations/${s.id}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...Object.keys(policySlugs).map((slug) => ({ url: absoluteUrl(`/policies/${slug}`), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
