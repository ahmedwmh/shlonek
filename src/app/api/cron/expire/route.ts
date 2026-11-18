import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { expireStaleOrders } from "@/features/payments/orders";
import { expireStaleHolds } from "@/features/consultations/booking";

/** Scheduled every few minutes (vercel.ts). Releases expired holds and unpaid orders. */
export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const orders = await expireStaleOrders();
  const holds = await expireStaleHolds();
  return NextResponse.json({ ok: true, orders, holds });
}
