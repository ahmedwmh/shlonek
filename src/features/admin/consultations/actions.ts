"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { BookingStatus, DeliveryMethod, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tags } from "@/lib/cache-tags";
import { sendEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getCoach } from "@/features/consultations/queries";
import { admin, parse, staff, zCheckbox, zIQD, zId, zText } from "../shared/guard";

/** "2026-11-20T16:00" typed in the admin form is Baghdad time (UTC+3, no DST). */
const zBaghdadLocal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "تاريخ غير صحيح")
  .transform((s) => new Date(`${s}:00+03:00`));

const serviceSchema = z.object({
  id: zId,
  title: zText(80, 2),
  description: zText(600, 5),
  durationMinutes: z.coerce.number().int().min(15, "على الأقل 15 دقيقة").max(240, "الحد 240 دقيقة"),
  price: zIQD,
  deliveryMethod: z.enum(DeliveryMethod),
  deliveryNote: z.string().trim().max(300).optional(),
  isActive: zCheckbox,
});

export async function updateService(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(serviceSchema, input);
  if (!v.ok) return v.result;
  const { id, ...data } = v.data;
  const before = await db.consultationService.findUnique({ where: { id }, select: { price: true } });
  if (!before) return fail("الخدمة غير موجودة.");

  await db.consultationService.update({ where: { id }, data: { ...data, deliveryNote: data.deliveryNote || null } });
  if (before.price !== data.price) {
    await audit({
      actorId: viewer.id,
      action: "price.consultation",
      entityType: "ConsultationService",
      entityId: id,
      meta: { from: before.price, to: data.price },
    });
  }
  updateTag(tags.consultationServices);
  refresh();
  return ok(undefined, "انحفظت الخدمة");
}

const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMinute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const availabilitySchema = z.object({
  rows: z
    .array(
      z.object({
        weekday: z.coerce.number().int().min(0).max(6),
        start: z.string().regex(timeRe, "وقت غير صحيح"),
        end: z.string().regex(timeRe, "وقت غير صحيح"),
      }),
    )
    .max(50),
});

/** Replaces the coach's weekly working hours. */
export async function saveAvailability(input: unknown): Promise<ActionResult> {
  const viewer = await admin();
  const v = parse(availabilitySchema, input);
  if (!v.ok) return v.result;
  const coach = await getCoach();
  if (!coach) return fail("ما كو كوتش معرّف.");

  const rows = v.data.rows.map((r) => ({ weekday: r.weekday, startMinute: toMinute(r.start), endMinute: toMinute(r.end) }));
  if (rows.some((r) => r.endMinute <= r.startMinute)) return fail("وقت النهاية لازم يكون بعد البداية.");
  for (const day of new Set(rows.map((r) => r.weekday))) {
    const list = rows.filter((r) => r.weekday === day).sort((a, b) => a.startMinute - b.startMinute);
    if (list.some((r, i) => i > 0 && r.startMinute < list[i - 1].endMinute)) return fail("فترات نفس اليوم متداخلة.");
  }

  await db.$transaction([
    db.weeklyAvailability.deleteMany({ where: { coachId: coach.id } }),
    db.weeklyAvailability.createMany({ data: rows.map((r) => ({ ...r, coachId: coach.id })) }),
  ]);
  await audit({ actorId: viewer.id, action: "availability.save", entityType: "User", entityId: coach.id, meta: { rows: rows.length } });
  refresh();
  return ok(undefined, "انحفظت أوقات العمل");
}

export async function addTimeOff(input: unknown): Promise<ActionResult> {
  await admin();
  const v = parse(z.object({ startsAt: zBaghdadLocal, endsAt: zBaghdadLocal, reason: z.string().trim().max(200).optional() }), input);
  if (!v.ok) return v.result;
  if (v.data.endsAt <= v.data.startsAt) return fail("النهاية لازم تكون بعد البداية.");
  const coach = await getCoach();
  if (!coach) return fail("ما كو كوتش معرّف.");
  await db.timeOff.create({ data: { coachId: coach.id, startsAt: v.data.startsAt, endsAt: v.data.endsAt, reason: v.data.reason || null } });
  refresh();
  return ok(undefined, "انضافت الإجازة");
}

export async function removeTimeOff(id: string): Promise<ActionResult> {
  await admin();
  if (!zId.safeParse(id).success) return fail("طلب غير صحيح.");
  await db.timeOff.deleteMany({ where: { id } });
  refresh();
  return ok(undefined, "انحذفت");
}

export async function setMeetingUrl(input: unknown): Promise<ActionResult> {
  await staff();
  const v = parse(z.object({ bookingId: zId, meetingUrl: z.union([z.url({ protocol: /^https$/, error: "رابط https صحيح" }), z.literal("")]) }), input);
  if (!v.ok) return v.result;
  await db.booking.update({ where: { id: v.data.bookingId }, data: { meetingUrl: v.data.meetingUrl || null } });
  refresh();
  return ok(undefined, "انحفظ الرابط");
}

const statusSchema = z.object({
  bookingId: zId,
  status: z.enum([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.CANCELLED]),
});

export async function setBookingStatus(input: unknown): Promise<ActionResult> {
  const viewer = await staff();
  const v = parse(statusSchema, input);
  if (!v.ok) return v.result;
  const booking = await db.booking.findUnique({ where: { id: v.data.bookingId }, select: { status: true } });
  if (!booking) return fail("الحجز غير موجود.");
  if (booking.status === BookingStatus.HELD || booking.status === BookingStatus.EXPIRED) {
    return fail("هذا حجز مؤقت غير مدفوع، ما تتغير حالته من هنا.");
  }
  try {
    await db.booking.update({ where: { id: v.data.bookingId }, data: { status: v.data.status } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("الموعد صار محجوز لشخص ثاني، ما ينفع ترجعه.");
    }
    throw error;
  }
  await audit({ actorId: viewer.id, action: "booking.status", entityType: "Booking", entityId: v.data.bookingId, meta: { from: booking.status, to: v.data.status } });
  refresh();
  return ok(undefined, "تحدّثت حالة الجلسة");
}

/** Moves one session to a new time. Keeps the rest of the package untouched. */
export async function rescheduleBooking(input: unknown): Promise<ActionResult> {
  const viewer = await staff();
  const v = parse(z.object({ bookingId: zId, startsAt: zBaghdadLocal }), input);
  if (!v.ok) return v.result;

  const booking = await db.booking.findUnique({
    where: { id: v.data.bookingId },
    include: { user: { select: { email: true } } },
  });
  if (!booking || booking.status !== BookingStatus.CONFIRMED) return fail("تگدر تغيّر موعد الجلسات المؤكدة فقط.");
  if (v.data.startsAt.getTime() < Date.now()) return fail("اختار وقت بالمستقبل.");

  const duration = booking.endsAt.getTime() - booking.startsAt.getTime();
  const startsAt = v.data.startsAt;
  const endsAt = new Date(startsAt.getTime() + duration);

  const clash = await db.booking.findFirst({
    where: {
      id: { not: booking.id },
      coachId: booking.coachId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      OR: [
        { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
        { status: BookingStatus.HELD, holdExpiresAt: { gt: new Date() } },
      ],
    },
  });
  if (clash) return fail("هذا الوقت يتعارض ويه جلسة ثانية.");

  try {
    await db.booking.update({ where: { id: booking.id }, data: { startsAt, endsAt } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("هذا الوقت انحجز.");
    throw error;
  }
  await audit({
    actorId: viewer.id,
    action: "booking.reschedule",
    entityType: "Booking",
    entityId: booking.id,
    meta: { from: booking.startsAt.toISOString(), to: startsAt.toISOString() },
  });
  await sendEmail({
    to: booking.user.email,
    subject: "تغيّر موعد جلستك",
    heading: "موعد جلستك الجديد",
    body: `صار موعد جلستك: ${formatDateTime(startsAt)} (بتوقيت بغداد).`,
    ctaLabel: "استشاراتي",
    ctaPath: "/account/consultations",
  });
  refresh();
  return ok(undefined, "تغيّر الموعد ووصل العضو بريد");
}
