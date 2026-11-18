import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";

export async function getVisibleTeam() {
  "use cache";
  cacheTag(tags.team);
  cacheLife("hours");
  return db.teamMember.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } });
}
