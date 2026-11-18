import "server-only";
import { Prisma, PrivatePostStatus, PublicPostStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type InboxFilters = { status?: string; publicStatus?: string; q?: string };

const asEnum = <T extends Record<string, string>>(e: T, v?: string) =>
  v && Object.values(e).includes(v) ? (v as T[keyof T]) : undefined;

export async function listInbox(filters: InboxFilters) {
  const status = asEnum(PrivatePostStatus, filters.status);
  const publicStatus = asEnum(PublicPostStatus, filters.publicStatus);
  const q = filters.q?.trim().slice(0, 100);

  const where: Prisma.PrivatePostWhereInput = {
    ...(status ? { status } : {}),
    ...(publicStatus ? { publicPost: { status: publicStatus } } : {}),
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  return db.privatePost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      body: true,
      status: true,
      createdAt: true,
      publishConsent: true,
      user: { select: { id: true, name: true, email: true } },
      publicPost: { select: { status: true } },
    },
  });
}

export async function getInboxPost(id: string) {
  return db.privatePost.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, contactByEmail: true, contactByPhone: true } },
      publicPost: { include: { reviewedBy: { select: { name: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
}
