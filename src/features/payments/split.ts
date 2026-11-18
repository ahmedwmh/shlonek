import { WAYL_MIN_AMOUNT } from "./wayl-constants";

/**
 * How an order total splits between wallet and gateway.
 * Wayl needs ≥ 1,000 IQD, so when the wallet covers almost everything we take a
 * little less from the wallet: the member never pays more than the total.
 *   total 25,000 · wallet 24,500 → wallet 24,000 + Wayl 1,000 (500 stays in the wallet)
 */
export function splitPayment(total: number, walletAvailable: number, useWallet: boolean) {
  const available = useWallet ? Math.max(0, walletAvailable) : 0;
  if (available >= total) return { walletAmount: total, gatewayAmount: 0 };
  const gatewayAmount = Math.max(total - available, WAYL_MIN_AMOUNT);
  return { walletAmount: Math.max(0, total - gatewayAmount), gatewayAmount };
}
