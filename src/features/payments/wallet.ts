import "server-only";
import { WalletTxType } from "@/generated/prisma/client";
import { db, type Tx } from "@/lib/db";
import { UserFacingError } from "@/lib/action-result";

/**
 * Wallet = balance + reserved ("held") amount + an append-only ledger.
 * Every balance change writes a WalletTransaction in the same DB transaction,
 * and rows are locked (SELECT … FOR UPDATE) so concurrent spends can't overdraw.
 */

export async function lockWallet(tx: Tx, userId: string) {
  await tx.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
  const [wallet] = await tx.$queryRaw<{ id: string; balance: number; held: number }[]>`
    SELECT "id", "balance", "held" FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
  return wallet;
}

export const spendable = (w: { balance: number; held: number }) => w.balance - w.held;

/** Credit (top-up, refund) or debit (purchase) with a ledger row. */
export async function postWalletEntry(
  tx: Tx,
  input: {
    userId: string;
    type: WalletTxType;
    amount: number;
    orderId?: string | null;
    actorId?: string | null;
    note?: string | null;
    /** Also release this much from the reserved amount (gateway split payments). */
    releaseHeld?: number;
  },
) {
  if (!Number.isInteger(input.amount) || input.amount === 0) throw new UserFacingError("مبلغ غير صحيح.");
  const wallet = await lockWallet(tx, input.userId);
  const releaseHeld = input.releaseHeld ?? 0;
  const balance = wallet.balance + input.amount;
  const held = wallet.held - releaseHeld;
  if (balance < 0 || held < 0 || held > balance) throw new UserFacingError("رصيد المحفظة ما يكفي.");

  await tx.wallet.update({ where: { id: wallet.id }, data: { balance, held } });
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: input.type,
      amount: input.amount,
      balanceAfter: balance,
      orderId: input.orderId ?? null,
      actorId: input.actorId ?? null,
      note: input.note ?? null,
    },
  });
}

export async function holdWalletAmount(tx: Tx, userId: string, amount: number) {
  if (amount <= 0) return;
  const wallet = await lockWallet(tx, userId);
  if (spendable(wallet) < amount) throw new UserFacingError("رصيد المحفظة تغيّر، حدّث الصفحة.");
  await tx.wallet.update({ where: { id: wallet.id }, data: { held: wallet.held + amount } });
}

export async function releaseWalletHold(tx: Tx, userId: string, amount: number) {
  if (amount <= 0) return;
  const wallet = await lockWallet(tx, userId);
  await tx.wallet.update({ where: { id: wallet.id }, data: { held: Math.max(0, wallet.held - amount) } });
}

export async function getWalletSummary(userId: string) {
  const wallet = await db.wallet.findUnique({ where: { userId } });
  return {
    balance: wallet?.balance ?? 0,
    held: wallet?.held ?? 0,
    available: wallet ? spendable(wallet) : 0,
  };
}

export async function getWalletHistory(userId: string, take = 50) {
  return db.walletTransaction.findMany({
    where: { wallet: { userId } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceAfter: true,
      note: true,
      createdAt: true,
      order: { select: { number: true, title: true } },
    },
  });
}
