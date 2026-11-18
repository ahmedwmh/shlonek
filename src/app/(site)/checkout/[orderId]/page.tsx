import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireViewer } from "@/lib/auth/dal";
import { getSettings } from "@/features/settings/queries";
import { getOrderForUser, isWaylActive } from "@/features/payments/orders";
import { getWalletSummary } from "@/features/payments/wallet";
import { cancelOrder } from "@/features/payments/actions";
import { OrderSummary } from "@/features/payments/components/order-summary";
import { PaymentOptions } from "@/features/payments/components/payment-options";

export const metadata: Metadata = { title: "الدفع", robots: { index: false } };

async function Checkout({ params }: PageProps<"/checkout/[orderId]">) {
  const { orderId } = await params;
  const viewer = await requireViewer(`/checkout/${orderId}`);
  const order = await getOrderForUser(orderId, viewer.id);
  if (!order) notFound();
  if (order.status !== "AWAITING_PAYMENT") redirect(`/checkout/${orderId}/result`);

  const [wallet, gatewayEnabled, walletSettings] = await Promise.all([
    getWalletSummary(viewer.id),
    isWaylActive(),
    getSettings("wallet"),
  ]);
  const cancel = cancelOrder.bind(null, order.id);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <section className="sketch-card p-6" aria-label="ملخص الطلب">
        <OrderSummary order={order} />
        <form action={cancel} className="mt-6">
          <SubmitButton variant="ghost" size="sm" className="rounded-full text-muted-foreground">
            إلغاء الطلب واختيار موعد ثاني
          </SubmitButton>
        </form>
      </section>
      <section className="sketch-card p-6" aria-label="طريقة الدفع">
        <h2 className="mb-4 text-xl font-bold">طريقة الدفع</h2>
        <PaymentOptions
          orderId={order.id}
          total={order.total}
          walletAvailable={wallet.available}
          gatewayEnabled={gatewayEnabled}
          expiresAt={order.kind === "CONSULTATION" ? (order.expiresAt?.toISOString() ?? null) : null}
          topupInstructions={walletSettings.topupInstructions}
        />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          بالدفع توافق على{" "}
          <Link href="/policies/payment" className="underline">
            سياسة الدفع
          </Link>{" "}
          و
          <Link href="/policies/booking" className="underline">
            سياسة الحجز
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

export default function CheckoutPage(props: PageProps<"/checkout/[orderId]">) {
  return (
    <div className="shell max-w-4xl py-10 md:py-14">
      <h1 className="mb-6 text-3xl font-bold">راجع طلبك وادفع</h1>
      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        }
      >
        <Checkout {...props} />
      </Suspense>
    </div>
  );
}
