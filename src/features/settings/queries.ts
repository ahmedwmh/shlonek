import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { tags } from "@/lib/cache-tags";
import { settingsSchemas, type Settings, type SettingsKey } from "./schema";

export async function getSettings<K extends SettingsKey>(key: K): Promise<Settings<K>> {
  "use cache";
  cacheTag(tags.settings);
  cacheLife("hours");

  const row = await db.siteSetting.findUnique({ where: { key } });
  const parsed = settingsSchemas[key].safeParse(row?.value ?? {});
  return (parsed.success ? parsed.data : settingsSchemas[key].parse({})) as Settings<K>;
}
