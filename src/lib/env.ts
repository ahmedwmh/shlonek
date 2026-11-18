import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at startup.
 * Optional integrations (Supabase, Wayl, Resend) degrade gracefully when empty.
 */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),

  DEV_LOGIN_ENABLED: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  SESSION_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  ADMIN_EMAILS: z.string().default(""),

  WAYL_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  WAYL_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  WAYL_ENV: z.enum(["test", "live"]).default("test"),
  WAYL_API_URL: z.url().default("https://api.thewayl.com"),

  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.string().default("شلونك <no-reply@shlonek.com>"),
  /** Who gets staff alerts (new «احچيلي» posts). Falls back to ADMIN_EMAILS. */
  ADMIN_NOTIFY_EMAILS: z.string().default(""),

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
