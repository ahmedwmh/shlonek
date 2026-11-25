/**
 * The first three recorded workshops (free for every signed-in member).
 * Title, description, topics, presenter and length come from each YouTube video
 * itself; the slug comes from the title (same rule as the dashboard).
 * Idempotent: an existing slug is skipped, so dashboard edits are never overwritten.
 * Run: pnpm tsx prisma/seed-workshops.ts   (uses DATABASE_URL)
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/features/courses/slug";
import { fetchYouTubeDetails } from "../src/features/courses/youtube-details";

export const firstWorkshopVideos = ["0GNmukJharM", "PcgM7JL7rds", "waYGbCdLTDA"] as const;

export async function seedWorkshops(db: PrismaClient) {
  for (const [i, videoId] of firstWorkshopVideos.entries()) {
    if (await db.courseLesson.findFirst({ where: { videoId, course: { kind: "WORKSHOP" } }, select: { id: true } })) {
      console.log(`skip  ${videoId} (already added)`);
      continue;
    }
    const d = await fetchYouTubeDetails(videoId);
    if (!d?.title) {
      console.log(`skip  ${videoId} (YouTube details unavailable, add it from the dashboard)`);
      continue;
    }
    const slug = slugify(d.title);
    await db.course.create({
      data: {
        slug,
        kind: "WORKSHOP",
        access: "FREE",
        status: "PUBLISHED",
        publishedAt: new Date(),
        title: d.title,
        summary: d.summary,
        description: d.description,
        topics: d.topics,
        presenter: d.presenter,
        sortOrder: i,
        lessons: { create: { title: d.title, provider: "YOUTUBE", videoId, durationMinutes: d.durationMinutes, sortOrder: 0 } },
      },
    });
    console.log(`added ${slug}`);
  }
}

// Run directly (not when imported by prisma/seed.ts).
if (process.argv[1]?.endsWith("seed-workshops.ts")) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  seedWorkshops(db)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
