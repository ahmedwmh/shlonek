import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ClockIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireViewer } from "@/lib/auth/dal";
import { formatDate, formatTime } from "@/lib/format";
import { getOrderForUser, refreshGatewayStatus } from "@/features/payments/orders";
import { OrderSummary } from "@/features/payments/components/order-summary";
import { AutoRefresh } from "@/features/payments/components/auto-refresh";

export const metadata: Metadata = { title: "حالة الدفع", robots: { index: false } };

const views = {
  PAID: { icon: CheckIcon, title: "تم! طلبك مؤكد", body: "وصلك بريد بالتفاصيل، وتلگى كلشي بحسابك." },
  VERIFYING: { icon: ClockIcon, title: "دا نتحقق من الدفع…", body: "لا تدفع مرة ثانية. هاي الصفحة تتحدث وحدها أول ما يتأكد الدفع." },
  NEEDS_REVIEW: {
    icon: TriangleAlertIcon,
    title: "وصلنا دفعك، بس الموعد تغيّر",
    body: "الدفع وصل بعد انتهاء مهلة الحجز. فريقنا راح يتواصل وياك حتى نختار موعد بديل أو نسترجع المبلغ.",
  },
  AWAITING_PAYMENT: { icon: XIcon, title: "ما كمل الدفع", body: "ما انسحب أي مبلغ. تگدر تحاول مرة ثانية ضمن مهلة الحجز." },
  FAILED: { icon: XIcon, title: "فشل الدفع", body: "ما انسحب أي مبلغ. حاول مرة ثانية." },
  EXPIRED: { icon: ClockIcon, title: "انتهت مهلة الطلب", body: "ما انسحب أي مبلغ. اختار موعد جديد وابدأ من جديد." },
  CANCELLED: { icon: XIcon, title: "الطلب ملغي", body: "ما انسحب أي مبلغ." },
  REFUNDED: { icon: CheckIcon, title: "تم استرداد المبلغ", body: "رجعنا المبلغ حسب السياسة." },
  PARTIALLY_REFUNDED: { icon: CheckIcon, title: "تم استرداد جزء من المبلغ", body: "التفاصيل بطلباتك." },
} as const;

async function Result({ params }: PageProps<"/checkout/[orderId]/result">) {
  const { orderId } = await params;
  const viewer = await requireViewer(`/checkout/${orderId}/result`);

  // Never trust the redirect: ask Wayl directly (server-to-server) for this order's status.
  await refreshGatewayStatus(orderId);
  const order = await getOrderForUser(orderId, viewer.id);
  if (!order) notFound();

  const view = views[order.status];
  const Icon = view.icon;
  const success = order.status === "PAID";

  return (
    <div className="flex flex-col gap-6">
      {order.status === "VERIFYING" && <AutoRefresh />}
      <div className="sketch-card flex flex-col items-center gap-3 p-8 text-center" role="status">
        <span
          className={
            success
              ? "grid size-14 place-items-center rounded-full bg-foreground text-background"
              : "grid size-14 place-items-center rounded-full border-2 border-foreground"
          }
        >
          <Icon className="size-7" />
        </span>
        <h1 className="text-3xl font-bold">{view.title}</h1>
        <p className="max-w-md text-muted-foreground">{view.body}</p>
        {success && order.premiumPeriod && (
          <p className="font-semibold">
            بريميوم فعّال من {formatDate(order.premiumPeriod.startsAt)} إلى {formatDate(order.premiumPeriod.endsAt)}
          </p>
        )}
        {success && order.consultation && (
          <p className="text-sm">
            أول جلسة: {formatDate(order.consultation.bookings[0].startsAt)} ·{" "}
            {formatTime(order.consultation.bookings[0].startsAt)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {order.status === "AWAITING_PAYMENT" ? (
            <Button asChild className="rounded-full">
              <Link href={`/checkout/${order.id}`}>حاول مرة ثانية</Link>
            </Button>
          ) : order.status === "EXPIRED" || order.status === "CANCELLED" ? (
            <Button asChild className="rounded-full">
              <Link href={order.kind === "PREMIUM" ? "/premium" : "/consultations"}>ابدأ من جديد</Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full">
              <Link href={order.kind === "PREMIUM" ? "/account/subscription" : "/account/consultations"}>افتح حسابي</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="rounded-full border-2 border-foreground">
            <Link href="/account/orders">طلباتي</Link>
          </Button>
        </div>
      </div>
      <div className="sketch-card p-6">
        <OrderSummary order={order} />
      </div>
    </div>
  );
}

export default function ResultPage(props: PageProps<"/checkout/[orderId]/result">) {
  return (
    <div className="shell max-w-2xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Result {...props} />
      </Suspense>
    </div>
  );
}
