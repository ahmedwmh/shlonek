import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Character, type CharacterName } from "@/components/brand/character";
import { Reveal } from "@/components/motion/reveal";

const pillars: {
  n: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  character: CharacterName;
  soon?: boolean;
}[] = [
  {
    n: "01",
    title: "اعرف نفسك",
    body: "تمارين تفاعلية قصيرة تساعدك تكتشف شخصيتك، قناعاتك، مشاعرك وأنماط تفكيرك. كل محاولة تنحفظ بسجلك.",
    href: "/exercises",
    cta: "ابدأ تمرين",
    character: "thinking",
  },
  {
    n: "02",
    title: "اختار بوعي",
    body: "جلسات وأدوات تساعدك تفهم خياراتك وتتخذ قرار يتناسب وياك، جلسة وحدة أو باقة شهرية.",
    href: "/consultations",
    cta: "احجز استشارة",
    character: "welcoming",
  },
  {
    n: "03",
    title: "عيش حياتك",
    body: "كورسات وتجارب عملية تحوّل فهمك لنفسك إلى خطوات صغيرة بحياتك اليومية.",
    href: "/courses",
    cta: "تعرّف أكثر",
    character: "relaxed",
    soon: true,
  },
];

export function Pillars() {
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {pillars.map((p, i) => (
        <li key={p.n}>
          <Reveal delay={i * 0.08} className="h-full">
            <Link
              href={p.href}
              className="sketch-card group flex h-full flex-col overflow-hidden transition-[translate,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--foreground)]"
            >
              <div className="relative flex h-44 items-end justify-center border-b-2 border-foreground bg-muted pt-6">
                <span className="absolute start-4 top-3 text-sm font-extrabold tabular-nums" dir="ltr">
                  {p.n}
                </span>
                {p.soon && (
                  <span className="absolute end-4 top-3 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-bold text-background">
                    قريباً
                  </span>
                )}
                <Character
                  name={p.character}
                  className="h-36 w-auto transition-transform duration-300 ease-out group-hover:-translate-y-1.5"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h3 className="text-2xl font-extrabold">{p.title}</h3>
                <p className="flex-1 leading-7 text-muted-foreground">{p.body}</p>
                <span className="inline-flex items-center gap-2 self-start font-bold">
                  {p.cta}
                  <span className="grid size-7 place-items-center rounded-full bg-foreground text-background transition-transform duration-200 group-hover:-translate-x-1">
                    <ArrowLeftIcon className="size-4" />
                  </span>
                </span>
              </div>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
