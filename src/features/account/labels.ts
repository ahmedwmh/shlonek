/** Arabic labels for statuses shown to members. */
export const bookingStatusLabel = {
  HELD: "محجوز مؤقتاً",
  CONFIRMED: "قادمة",
  EXPIRED: "انتهت المهلة",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
  NO_SHOW: "لم يحضر",
} as const;

export const orderStatusLabel = {
  AWAITING_PAYMENT: "بانتظار الدفع",
  VERIFYING: "قيد التحقق",
  PAID: "مدفوع",
  FAILED: "فشل",
  CANCELLED: "ملغي",
  EXPIRED: "انتهت المهلة",
  NEEDS_REVIEW: "قيد المراجعة",
  REFUNDED: "مسترد",
  PARTIALLY_REFUNDED: "مسترد جزئياً",
} as const;

export const publicPostStatusLabel = {
  PENDING_REVIEW: "بانتظار المراجعة",
  PUBLISHED: "منشورة بدون اسم",
  REJECTED: "ما انتشرت",
  HIDDEN: "مخفية",
} as const;

export const walletTxLabel = {
  TOPUP: "شحن رصيد",
  PURCHASE: "شراء",
  REFUND: "استرداد",
  ADJUSTMENT: "تعديل",
} as const;
