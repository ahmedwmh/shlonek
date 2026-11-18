import type { Metadata } from "next";
import Link from "next/link";
import { AtSignIcon, MailIcon, MessageCircleIcon, PhoneIcon, SendIcon } from "lucide-react";
import { People } from "@/components/brand/character";
import { Reveal } from "@/components/motion/reveal";
import { getSettings } from "@/features/settings/queries";
import { getVisibleTeam } from "@/features/about/queries";
import { safeHttpUrl, safeMailto, safeTel, safeWhatsApp } from "@/lib/safe-url";

export const metadata: Metadata = {
  alternates: { canonical: "/about" }, title: "من إحنا", description: "شلونك منصة لايف كوتشينج تفاعلية." };

const pillars = [
  { title: "اعرف نفسك", body: "تمارين تفاعلية تساعدك تكتشف شخصيتك، قناعاتك، مشاعرك وأنماط تفكيرك." },
  { title: "اختار بوعي", body: "تمارين وأدوات تساعدك تفهم خياراتك وتتخذ قرارات تتناسب وياك." },
  { title: "عيش حياتك", body: "كورسات وتجارب عملية تحوّل فهمك لنفسك إلى خطوات بحياتك اليومية." },
];

export default async function AboutPage() {
  const [about, contact, team] = await Promise.all([getSettings("about"), getSettings("contact"), getVisibleTeam()]);

  // Admin-entered values become links only through scheme whitelists (no javascript: etc.).
  const channels = [
    { icon: PhoneIcon, label: contact.phone, href: safeTel(contact.phone) },
    { icon: MessageCircleIcon, label: "واتساب", href: safeWhatsApp(contact.whatsapp) },
    { icon: MailIcon, label: contact.email, href: safeMailto(contact.email) },
    { icon: AtSignIcon, label: "انستغرام", href: safeHttpUrl(contact.instagram) },
    { icon: SendIcon, label: "تيليجرام", href: safeHttpUrl(contact.telegram) },
  ].filter((c): c is { icon: typeof PhoneIcon; label: string; href: string } => Boolean(c.href && c.label));

  return (
    <div className="shell py-10 md:py-14">
      <header className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">{about.title}</h1>
        <p className="text-lg leading-8 text-muted-foreground">{about.intro}</p>
        <p className="leading-8 text-muted-foreground">
          «شلونك» كلمة عراقية معناها «كيف حالك»، وهي أول سؤال نسأله لبعض. وهنا نسألك من صدگ.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-3xl">
        <People />
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {pillars.map((p, i) => (
          <li key={p.title}>
            <Reveal delay={i * 0.08} className="sketch-card h-full p-6">
              <h2 className="text-2xl font-bold">{p.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{p.body}</p>
            </Reveal>
          </li>
        ))}
      </ul>

      {team.length > 0 && (
        <section aria-labelledby="team" className="mt-16">
          <h2 id="team" className="mb-6 text-3xl font-bold">
            الفريق
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <li key={m.id} className="sketch-card flex flex-col gap-2 p-6">
                {m.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-provided URL, any host
                  <img src={m.photoUrl} alt="" className="mb-2 size-20 rounded-full border-2 border-foreground object-cover" />
                )}
                <p className="text-xl font-bold">{m.name}</p>
                <p className="text-sm font-semibold text-muted-foreground">{m.role}</p>
                {m.bio && <p className="leading-7">{m.bio}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="contact" aria-labelledby="contact-title" className="mt-16 scroll-mt-28">
        <div className="sketch-card flex flex-col gap-4 p-7">
          <h2 id="contact-title" className="text-3xl font-bold">
            تواصل ويانا
          </h2>
          {channels.length ? (
            <ul className="flex flex-wrap gap-3">
              {channels.map((c) => (
                <li key={c.href}>
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-4 py-2 font-semibold transition-colors hover:bg-foreground hover:text-background"
                  >
                    <c.icon className="size-4" />
                    <span dir="auto">{c.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">معلومات التواصل راح تنضاف قريباً.</p>
          )}
          <p className="text-sm text-muted-foreground">
            اقرأ{" "}
            <Link href="/policies/privacy" className="underline">
              سياسة الخصوصية
            </Link>{" "}
            و
            <Link href="/policies/terms" className="underline">
              شروط الاستخدام
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
