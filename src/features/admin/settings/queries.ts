import "server-only";
import { PolicyKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { settingsSchemas, type Settings, type SettingsKey } from "@/features/settings/schema";

/** Fresh (uncached) settings for editing, with schema defaults filled in. */
export async function getEditableSettings() {
  const rows = await db.siteSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as { [K in SettingsKey]: Settings<K> };
  for (const key of Object.keys(settingsSchemas) as SettingsKey[]) {
    const parsed = settingsSchemas[key].safeParse(byKey.get(key) ?? {});
    (out as Record<string, unknown>)[key] = parsed.success ? parsed.data : settingsSchemas[key].parse({});
  }
  return out;
}

export async function getTeamAdmin() {
  return db.teamMember.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function getPoliciesAdmin() {
  const all = await db.policy.findMany({ orderBy: { publishedAt: "desc" } });
  return Object.values(PolicyKind).map((kind) => ({
    kind,
    latest: all.find((p) => p.kind === kind) ?? null,
    count: all.filter((p) => p.kind === kind).length,
  }));
}
