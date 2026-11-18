import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "prisma migrate deploy && next build",
  crons: [
    // Safety-net sweep, once a day (Vercel Hobby allows daily crons only). Expired holds
    // and unpaid orders are also settled on the spot whenever the member acts
    // (booking, paying, opening wallet/orders) — see expireStaleOrders({ userId }).
    // Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
    { path: "/api/cron/expire", schedule: "0 3 * * *" },
  ],
};
