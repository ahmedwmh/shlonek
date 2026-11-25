/** Arabic labels for enums shown in the admin dashboard. */

type Tone = "default" | "secondary" | "outline" | "destructive";
export type Labelled = { label: string; tone: Tone };

export const privatePostStatus: Record<string, Labelled> = {
  NEW: { label: "جديد", tone: "default" },
  READ: { label: "مقروء", tone: "secondary" },
  FOLLOWING: { label: "قيد المتابعة", tone: "outline" },
  CLOSED: { label: "مغلق", tone: "secondary" },
};

export const publicPostStatus: Record<string, Labelled> = {
  PENDING_REVIEW: { label: "بانتظار المراجعة", tone: "default" },
  PUBLISHED: { label: "منشور", tone: "outline" },
  REJECTED: { label: "مرفوض", tone: "destructive" },
  HIDDEN: { label: "مخفي", tone: "secondary" },
};

export const bookingStatus: Record<string, Labelled> = {
  HELD: { label: "محجوز مؤقتاً", tone: "secondary" },
  CONFIRMED: { label: "مؤكد", tone: "default" },
  EXPIRED: { label: "انتهت مهلته", tone: "secondary" },
  COMPLETED: { label: "مكتمل", tone: "outline" },
  CANCELLED: { label: "ملغى", tone: "destructive" },
  NO_SHOW: { label: "لم يحضر", tone: "destructive" },
};

export const orderStatus: Record<string, Labelled> = {
  AWAITING_PAYMENT: { label: "بانتظار الدفع", tone: "secondary" },
  VERIFYING: { label: "قيد التحقق", tone: "outline" },
  PAID: { label: "مدفوع", tone: "default" },
  FAILED: { label: "فشل", tone: "destructive" },
  CANCELLED: { label: "ملغى", tone: "secondary" },
  EXPIRED: { label: "انتهت مهلته", tone: "secondary" },
  NEEDS_REVIEW: { label: "يحتاج مراجعة", tone: "destructive" },
  REFUNDED: { label: "مسترد", tone: "outline" },
  PARTIALLY_REFUNDED: { label: "مسترد جزئياً", tone: "outline" },
};

export const orderKind: Record<string, string> = { CONSULTATION: "استشارة", PREMIUM: "بريميوم", COURSE: "كورس" };

export const contentStatus: Record<string, Labelled> = {
  DRAFT: { label: "مسودة", tone: "secondary" },
  PUBLISHED: { label: "منشور", tone: "default" },
  ARCHIVED: { label: "مؤرشف", tone: "outline" },
};

export const exerciseAccess: Record<string, Labelled> = {
  FREE: { label: "مجاني", tone: "outline" },
  PREMIUM: { label: "بريميوم", tone: "default" },
};

export const roleLabel: Record<string, string> = { MEMBER: "عضو", COACH: "كوتش", ADMIN: "مدير" };

export const walletTxType: Record<string, string> = {
  TOPUP: "شحن",
  PURCHASE: "شراء",
  REFUND: "استرداد",
  ADJUSTMENT: "تعديل",
};

export const refundStatus: Record<string, Labelled> = {
  REQUESTED: { label: "مطلوب", tone: "secondary" },
  COMPLETED: { label: "مكتمل", tone: "default" },
  REJECTED: { label: "مرفوض", tone: "destructive" },
};

export const consultationKind: Record<string, string> = { SINGLE: "استشارة فردية", PACKAGE: "باقة شهرية" };
export const deliveryMethod: Record<string, string> = { ONLINE: "أونلاين", IN_PERSON: "حضوري" };

export const policyKind: Record<string, string> = {
  PRIVACY: "سياسة الخصوصية",
  TERMS: "شروط الاستخدام",
  BOOKING: "سياسة الحجز",
  PAYMENT: "سياسة الدفع",
};

export const weekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const courseKind: Record<string, Labelled> = {
  COURSE: { label: "كورس", tone: "outline" },
  WORKSHOP: { label: "ورشة", tone: "outline" },
};

export const courseAccess: Record<string, Labelled> = {
  FREE: { label: "مجاني", tone: "outline" },
  PAID: { label: "مدفوع", tone: "default" },
  PREMIUM: { label: "لبريميوم", tone: "default" },
};

export const videoProvider: Record<string, Labelled> = {
  YOUTUBE: { label: "YouTube (غير مدرج)", tone: "outline" },
  VDOCIPHER: { label: "VdoCipher (محمي)", tone: "default" },
};

export const enrollmentSource: Record<string, Labelled> = {
  JOIN: { label: "انضمام", tone: "outline" },
  PURCHASE: { label: "شراء", tone: "default" },
  ADMIN: { label: "من الفريق", tone: "secondary" },
};
