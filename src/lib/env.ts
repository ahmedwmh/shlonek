import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at startup.
 * Optional integrations (Supabase, Wayl, Resend) degrade gracefully when empty.
 */
/**
 * Values pasted into a hosting dashboard often carry stray spaces or the quotes
 * from a .env line. Trim both; treat blank as "not set" so defaults apply.
 */
const clean = (v: unknown) => {
  if (typeof v !== "string") return v;
  const s = v.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return s === "" ? undefined : s;
};
const emptyToUndefined = clean;
const lower = (v: unknown) => {
  const s = clean(v);
  return typeof s === "string" ? s.toLowerCase() : s;
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.preprocess(clean, z.string().min(1)),
  NEXT_PUBLIC_SITE_URL: z.preprocess(clean, z.url().default("http://localhost:3000")),

  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),

  DEV_LOGIN_ENABLED: z.preprocess(lower, z.enum(["true", "false"]).optional()),
  SESSION_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  ADMIN_EMAILS: z.preprocess(clean, z.string().default("")),

  WAYL_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  WAYL_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  // Anything other than "live" (blank, a typo, "production") safely means test mode.
  WAYL_ENV: z.preprocess(lower, z.enum(["test", "live"]).default("test").catch("test")),
  WAYL_API_URL: z.preprocess(clean, z.url().default("https://api.thewayl.com")),

  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.preprocess(clean, z.string().default("شلونك <no-reply@shlonek.com>")),
  /** Who gets staff alerts (new «احچيلي» posts). Falls back to ADMIN_EMAILS. */
  ADMIN_NOTIFY_EMAILS: z.preprocess(clean, z.string().default("")),

  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const env = schema.parse(process.env);

export const features = {
  supabaseAuth: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  /** Local email login for development and testing. Never on in production. */
  devLogin: env.NODE_ENV !== "production" && env.DEV_LOGIN_ENABLED === "true" && Boolean(env.SESSION_SECRET),
  wayl: Boolean(env.WAYL_API_KEY && env.WAYL_WEBHOOK_SECRET),
  email: Boolean(env.RESEND_API_KEY),
} as const;

/** Real inboxes for staff alerts (dev-only `.local` addresses are skipped). */
export const adminNotifyEmails = (env.ADMIN_NOTIFY_EMAILS || env.ADMIN_EMAILS)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.includes("@") && !e.endsWith(".local"));

export const adminEmails = new Set(
  env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
