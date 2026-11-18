import { formatDate, formatIQD, formatTime } from "@/lib/format";
import type { getOrderForUser } from "../orders";

type Order = NonNullable<Awaited<ReturnType<typeof getOrderForUser>>>;

/** Pre-payment summary: product, slots, base price, discount, total, currency. */
export function OrderSummary({ order }: { order: Order }) {
  const bookings = order.consultation?.bookings ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">طلب #{order.number}</p>
        <h2 className="text-2xl font-bold">{order.title}</h2>
      </div>
      {bookings.length > 0 && (
        <ul className="flex flex-col gap-2">
          {bookings.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded-2xl border-2 border-foreground/15 px-3 py-2 text-sm">
              {bookings.length > 1 && <span className="text-muted-foreground">الجلسة {b.sequence}</span>}
              <span className="font-semibold">
                {formatDate(b.startsAt)} · {formatTime(b.startsAt)}
              </span>
            </li>
          ))}
          <li className="text-xs text-muted-foreground">
            التوقيت حسب بغداد · {order.consultation?.service.durationMinutes} دقيقة للجلسة ·{" "}
            {order.consultation?.service.deliveryMethod === "ONLINE" ? "أونلاين" : "حضوري"}
          </li>
        </ul>
      )}
      {order.premiumPlan && (
        <p className="text-sm text-muted-foreground">مدة الاشتراك: {order.premiumPlan.durationDays} يوم · بدون تجديد تلقائي</p>
      )}
      <dl className="grid grid-cols-2 gap-y-1.5 border-t-2 border-foreground pt-4 text-sm">
        <dt className="text-muted-foreground">السعر</dt>
        <dd className="text-end">{formatIQD(order.subtotal)}</dd>
        {order.discount > 0 && (
          <>
            <dt className="text-muted-foreground">الخصم</dt>
            <dd className="text-end">−{formatIQD(order.discount)}</dd>
          </>
        )}
        <dt className="text-base font-bold">المجموع</dt>
        <dd className="text-end text-xl font-extrabold">{formatIQD(order.total)}</dd>
        <dd className="col-span-2 text-xs text-muted-foreground">العملة: دينار عراقي (IQD) · بدون رسوم إضافية</dd>
      </dl>
    </div>
  );
}
