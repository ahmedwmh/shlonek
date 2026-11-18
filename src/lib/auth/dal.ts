import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/env";
import { getAuthIdentity, type AuthIdentity } from "./session";

/**
 * Data Access Layer for the signed-in member. Every Server Component, Server
 * Action and Route Handler goes through here; hiding a button is never the check.
 */
export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  termsVersion: string | null;
};

async function syncUser(identity: AuthIdentity) {
  const isAdminEmail = adminEmails.has(identity.email);
  return db.user.upsert({
    where: { authId: identity.authId },
    create: {
      authId: identity.authId,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      role: isAdminEmail ? Role.ADMIN : Role.MEMBER,
      wallet: { create: {} },
    },
    // Keep Google profile fresh; promote configured admins, never demote here.
    update: {
      email: identity.email,
      avatarUrl: identity.avatarUrl ?? undefined,
      ...(isAdminEmail ? { role: Role.ADMIN } : {}),
    },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, termsVersion: true },
  });
}

/** The current member, or null. Deduplicated per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const existing = await db.user.findUnique({
    where: { authId: identity.authId },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, termsVersion: true },
  });
  return existing ?? syncUser(identity);
});

/** Ensures a profile row exists right after sign-in (OAuth callback / dev login). */
export async function ensureUser(identity: AuthIdentity) {
  return syncUser(identity);
}

export async function requireViewer(next = "/"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export const isStaff = (viewer: Pick<Viewer, "role"> | null) =>
  viewer?.role === Role.ADMIN || viewer?.role === Role.COACH;

/** Staff areas 404 for everyone else, so their existence isn't advertised. */
export async function requireStaff(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!isStaff(viewer)) notFound();
  return viewer!;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer?.role !== Role.ADMIN) notFound();
  return viewer;
}
