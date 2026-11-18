import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth/dal";
import { getActiveService, getActiveServices, getCoach } from "@/features/consultations/queries";
import { getAvailableSlots } from "@/features/consultations/availability";
import { BookingWizard } from "@/features/consultations/components/booking-wizard";

export async function generateStaticParams() {
  return (await getActiveServices()).map((s) => ({ serviceId: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/consultations/[serviceId]">): Promise<Metadata> {
  const service = await getActiveService((await params).serviceId);
  return service ? { title: `حجز ${service.title}` } : {};
}

/** Fresh availability on every request; the hold is re-validated on the server anyway. */
async function Booking({ serviceId }: { serviceId: string }) {
  const service = (await getActiveService(serviceId))!;
  const [viewer, coach] = await Promise.all([getViewer(), getCoach()]);
  const slots = coach ? await getAvailableSlots({ coachId: coach.id, durationMinutes: service.durationMinutes }) : [];

  return (
    <BookingWizard
      service={{
        id: service.id,
        title: service.title,
        price: service.price,
        sessionsCount: service.sessionsCount,
        durationMinutes: service.durationMinutes,
        kind: service.kind,
      }}
      slots={slots}
      isSignedIn={Boolean(viewer)}
    />
  );
}

/** URL data is read inside Suspense so navigations stay instant (Cache Components). */
async function BookService({ params }: PageProps<"/consultations/[serviceId]">) {
  const { serviceId } = await params;
  const service = await getActiveService(serviceId);
  if (!service) notFound();

  return (
    <>
      <nav className="mb-3 text-sm text-muted-foreground sm:mb-6">
        <Link href="/consultations" className="hover:text-foreground">
          الاستشارات
        </Link>{" "}
        / <span className="text-foreground">{service.title}</span>
      </nav>
      <header className="mb-5 flex flex-col gap-1.5 sm:mb-8 sm:gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">{service.title}</h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {service.kind === "PACKAGE"
            ? "اختار موعد الجلسة الأولى، ونقترحلك نفس الوقت للأسابيع الجاية. تگدر تغيّر أي جلسة ضمن أسبوعها."
            : "اختار اليوم والساعة اللي تناسبك."}
        </p>
      </header>
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <Skeleton className="h-96 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        }
      >
        <Booking serviceId={serviceId} />
      </Suspense>
    </>
  );
}

export default function BookServicePage(props: PageProps<"/consultations/[serviceId]">) {
  return (
    <div className="shell py-6 sm:py-10 md:py-14">
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-3xl" />}>
        <BookService {...props} />
      </Suspense>
    </div>
  );
}
