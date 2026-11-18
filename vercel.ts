import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "prisma migrate deploy && next build",
  // Run server code next to the Supabase database (ap-northeast-1, Tokyo). Each page
  // makes several queries; from the default US region every one crosses the Pacific.
  regions: ["hnd1"],
  crons: [
    // Safety-net sweep, once a day (Vercel Hobby allows daily crons only). Expired holds
    // and unpaid orders are also settled on the spot whenever the member acts
    // (booking, paying, opening wallet/orders) — see expireStaleOrders({ userId }).
    // Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
    { path: "/api/cron/expire", schedule: "0 3 * * *" },
  ],
};
