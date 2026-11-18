import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/lib/db";

/** Records sensitive staff actions (top-ups, refunds, publishing, manual activations). */
export async function audit(
  entry: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    meta?: Prisma.InputJsonValue;
  },
  client: Tx | typeof db = db,
) {
  await client.auditLog.create({ data: { ...entry, entityId: entry.entityId ?? null } });
}
