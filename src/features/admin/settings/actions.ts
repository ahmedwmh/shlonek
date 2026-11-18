"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { PolicyKind, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tags } from "@/lib/cache-tags";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { settingsSchemas, type SettingsKey } from "@/features/settings/schema";
import { admin, parse, zCheckbox, zId, zText } from "../shared/guard";

export async function saveSettings(key: string, value: unknown): Promise<ActionResult> {
  const viewer = await admin();
  if (!(key in settingsSchemas)) return fail("إعداد غير معروف.");
  const schema = settingsSchemas[key as SettingsKey];
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[String(issue.path[0] ?? "_")] ??= []).push(issue.message);
    return fail("تأكد من القيم.", fieldErrors);
  }
  const data = parsed.data as Prisma.InputJsonValue;
  await db.siteSetting.upsert({ where: { key }, create: { key, value: data }, update: { value: data } });
  await audit({ actorId: viewer.id, action: "settings.save", entityType: "SiteSetting", entityId: key });
  updateTag(tags.settings);
  refresh();
  return ok(undefined, "انحفظت الإعدادات");
}

const teamSchema = z.object({
  name: zText(80, 2),
  role: zText(80, 2),
  bio: z.string().trim().max(800).optional(),
  photoUrl: z.union([z.url({ protocol: /^https$/, error: "رابط https صحيح" }), z.literal("")]).optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isVisible: zCheckbox,
});

export async function saveTeamMember(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(teamSchema.extend({ id: zId.optional() }), input);
  if (!v.ok) return v.result;
  const { id, ...rest } = v.data;
  const data = { ...rest, bio: rest.bio || null, photoUrl: rest.photoUrl || null };
  const member = id ? await db.teamMember.update({ where: { id }, data }) : await db.teamMember.create({ data });
  await audit({ actorId: viewer.id, action: id ? "team.update" : "team.create", entityType: "TeamMember", entityId: member.id });
  updateTag(tags.team);
  refresh();
  return ok(undefined, "انحفظ عضو الفريق");
}

export async function deleteTeamMember(id: string): Promise<ActionResult> {
  const viewer = await admin();
  if (!zId.safeParse(id).success) return fail("طلب غير صحيح.");
  await db.teamMember.deleteMany({ where: { id } });
  await audit({ actorId: viewer.id, action: "team.delete", entityType: "TeamMember", entityId: id });
  updateTag(tags.team);
  refresh();
  return ok(undefined, "انحذف");
}

/** Publishes a new policy version. Old versions stay for the consent record. */
export async function publishPolicy(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(z.object({ kind: z.enum(PolicyKind), title: zText(120, 2), body: zText(50_000, 20) }), input);
  if (!v.ok) return v.result;

  const versions = await db.policy.findMany({ where: { kind: v.data.kind }, select: { version: true } });
  const next = versions.reduce((max, p) => Math.max(max, Number.parseInt(p.version, 10) || 0), 0) + 1;
  const policy = await db.policy.create({ data: { ...v.data, version: String(next) } });
  await audit({ actorId: viewer.id, action: "policy.publish", entityType: "Policy", entityId: policy.id, meta: { kind: v.data.kind, version: next } });
  updateTag(tags.policies);
  refresh();
  return ok(undefined, `انتشر الإصدار ${next}`);
}
