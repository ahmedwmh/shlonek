import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrations) needs a direct connection. On Supabase that is the
// non-pooled URL (port 5432); the app itself uses the pooled DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
