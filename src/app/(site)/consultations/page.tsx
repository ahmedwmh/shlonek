import type { Metadata } from "next";
import { Character } from "@/components/brand/character";
import { Reveal } from "@/components/motion/reveal";
import { getActiveServices } from "@/features/consultations/queries";
import { ServiceCard } from "@/features/consultations/components/service-card";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/consultations" },
  title: "الاستشارات",
  description: "جلسة وحدة أو باقة شهرية من أربع جلسات، جلسة كل أسبوع.",
};

export default async function ConsultationsPage() {
  const services = await getActiveServices();

  return (
    <div className="shell py-10 md:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: services.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Service",
              name: s.title,
              description: s.description,
              serviceType: "Life coaching",
              provider: { "@id": absoluteUrl("/#org") },
              url: absoluteUrl(`/consultations/${s.id}`),
              offers: { "@type": "Offer", price: s.price, priceCurrency: "IQD", availability: "https://schema.org/InStock" },
            },
          })),
        }}
      />
      <header className="flex flex-col-reverse items-center gap-6 md:flex-row md:justify-between">
        <div className="flex max-w-xl flex-col gap-3 text-center md:text-start">
          <h1 className="text-4xl font-bold md:text-5xl">اختار بوعي</h1>
          <p className="text-lg leading-8 text-muted-foreground">
            جلسة وياك تساعدك تفهم خياراتك وتتخذ قرار يتناسب وياك. اختار اللي يناسبك.
          </p>
        </div>
        <Character name="welcoming" className="h-40 w-auto md:h-52" />
      </header>

      {services.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">الحجز غير متاح حالياً.</p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={i * 0.08} className="h-full">
              <ServiceCard service={service} featured={service.kind === "PACKAGE"} />
            </Reveal>
          ))}
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        الاستشارات تُشترى بشكل مستقل، ومو جزء من اشتراك بريميوم.
      </p>
    </div>
  );
}
