import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "prisma migrate deploy && next build",
  crons: [
    // Releases expired slot holds and unpaid orders (checks Wayl before expiring).
    // Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
    { path: "/api/cron/expire", schedule: "*/5 * * * *" },
  ],
};
