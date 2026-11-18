import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { features } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEV_SESSION_COOKIE, decodeDevSession } from "./dev-session";

/** Who the request belongs to, according to the auth provider (not our DB). */
export type AuthIdentity = {
  authId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  // Sessions depend on the request and the current time (token expiry): never prerendered.
  await connection();
  if (features.supabaseAuth) {
    const supabase = await createSupabaseServerClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    const user = data.user;
    if (user?.email) {
      const meta = user.user_metadata ?? {};
      return {
        authId: user.id,
        email: user.email.toLowerCase(),
        name: String(meta.full_name ?? meta.name ?? user.email.split("@")[0]),
        avatarUrl: (meta.avatar_url as string | undefined) ?? null,
      };
    }
  }

  if (features.devLogin) {
    const dev = decodeDevSession((await cookies()).get(DEV_SESSION_COOKIE)?.value);
    if (dev) return { authId: `dev:${dev.email}`, email: dev.email, name: dev.name, avatarUrl: null };
  }

  return null;
}
