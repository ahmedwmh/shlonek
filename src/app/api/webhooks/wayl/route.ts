import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { getWaylLink, verifyWaylSignature, waylWebhookSchema } from "@/features/payments/wayl";
import { applyGatewayStatus } from "@/features/payments/orders";

/**
 * Wayl → us. Signature is checked against the RAW body before parsing.
 * Signed events are stored (deduped by key), and the status we act on is re-read
 * from Wayl's API, so a forged or replayed payload can't activate anything.
 */
export async function POST(request: NextRequest) {
  if (!features.wayl) return NextResponse.json({ ok: false }, { status: 404 });

  // Cheap checks first: size cap and signature, before any parsing or DB write,
  // so forged or junk requests can't fill the events table.
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64_000) return NextResponse.json({ ok: false }, { status: 413 });
  const raw = await request.text();
  if (raw.length > 64_000) return NextResponse.json({ ok: false }, { status: 413 });
  const signatureValid = verifyWaylSignature(raw, request.headers.get("x-wayl-signature-256"));
  if (!signatureValid) return NextResponse.json({ ok: false }, { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = waylWebhookSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { referenceId, paymentStatus } = parsed.data;
  const order = await db.order.findUnique({ where: { waylReferenceId: referenceId }, select: { id: true } });

  try {
    await db.paymentEvent.create({
      data: {
        provider: "wayl",
        eventKey: `wayl:${referenceId}:${paymentStatus ?? parsed.data.event ?? "unknown"}`,
        status: paymentStatus ?? null,
        signatureValid,
        payload: payload as Prisma.InputJsonValue,
        orderId: order?.id ?? null,
      },
    });
  } catch (error) {
    // A repeat delivery is only stored once, but we still re-sync below: if the
    // first delivery failed half-way, Wayl's retry must be able to finish it.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }

  // Source of truth: ask Wayl for the link's current status (never trust the payload).
  // If Wayl can't be reached, answer non-2xx so Wayl retries the webhook later.
  const link = await getWaylLink(referenceId).catch((error) => {
    console.error("[wayl] webhook status lookup failed", error);
    return null;
  });
  if (!link) return NextResponse.json({ ok: false }, { status: 503 });
  await applyGatewayStatus(referenceId, link.status, link.total);

  return NextResponse.json({ ok: true });
}
