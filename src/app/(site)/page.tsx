import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpIcon, PencilLineIcon } from "lucide-react";
import { Character } from "@/components/brand/character";
import { Reveal } from "@/components/motion/reveal";
import { getViewer } from "@/lib/auth/dal";
import { getPublishedPosts } from "@/features/posts/queries";
import { samplePosts } from "@/features/posts/samples";
import { TellMeBox } from "@/features/posts/components/tell-me-box";
import { PublicBubbles } from "@/features/posts/components/public-bubbles";
import { PeopleRow } from "@/features/home/components/people-row";
import { SectionHeading } from "@/features/home/components/section-heading";
import { Pillars } from "@/features/home/components/pillars";
import { ClosingCta } from "@/features/home/components/closing-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

async function TellMe() {
  const viewer = await getViewer();
  return <TellMeBox isSignedIn={Boolean(viewer)} />;
}

/** Same footprint as the real box, so nothing jumps when the session streams in. */
function TellMeFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="sketch-card flex items-center gap-3 px-5 py-4">
        <PencilLineIcon className="size-5 text-muted-foreground" />
        <span className="flex-1 text-lg text-muted-foreground">احچيلي، شلونك اليوم؟</span>
        <span className="grid size-10 place-items-center rounded-full bg-foreground text-background">
          <ArrowUpIcon className="size-5" />
        </span>
      </div>
    </div>
  );
}

async function PublicPosts() {
  const posts = await getPublishedPosts();
  if (posts.length === 0) {
    // Labelled examples until the first real post is approved.
    return (
      <div className="flex flex-col gap-4">
        <p className="self-start rounded-full border border-dashed border-foreground px-3 py-1 text-xs font-semibold">
          أمثلة توضيحية · تختفي أول ما تنشر مشاركات حقيقية
        </p>
        <PublicBubbles posts={samplePosts} />
      </div>
    );
  }
  return <PublicBubbles posts={posts} />;
}

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": absoluteUrl("/#org"),
              name: SITE_NAME,
              url: absoluteUrl("/"),
              logo: absoluteUrl("/brand/logo.svg"),
              description: SITE_DESCRIPTION,
              areaServed: { "@type": "Country", name: "Iraq" },
            },
            {
              "@type": "WebSite",
              "@id": absoluteUrl("/#website"),
              url: absoluteUrl("/"),
              name: SITE_NAME,
              inLanguage: "ar-IQ",
              publisher: { "@id": absoluteUrl("/#org") },
            },
          ],
        }}
      />
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Soft dotted texture, decorative only */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] [background-image:radial-gradient(var(--border)_1.2px,transparent_1.2px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        {/*
          The hero fills most of the screen below the header (~90% on phones, ~88% on
          larger screens): title, short line and input centred in the space, the
          characters standing on the bottom line.
        */}
        <div className="shell relative flex min-h-[calc(90svh-4rem)] flex-col items-center text-center md:min-h-[calc(88svh-5rem)]">
          <div className="flex w-full flex-1 flex-col items-center justify-center py-6 md:py-10">
            <h1 className="animate-rise text-[3.5rem] leading-none font-extrabold tracking-tight [animation-delay:60ms] min-[380px]:text-6xl sm:text-7xl md:text-8xl">
              شلونك؟
            </h1>
            <p className="mt-3 max-w-md animate-rise text-base leading-7 text-balance text-muted-foreground [animation-delay:120ms] sm:mt-4 sm:max-w-xl sm:text-lg sm:leading-8 md:text-xl">
              <span className="sm:hidden">أول سؤال نسأله لبعض، وهنا نسألك من صدگ.</span>
              <span className="hidden sm:inline">
                أول سؤال نسأله لبعض. هنا نسألك من صدگ، ونساعدك تعرف نفسك، تختار بوعي، وتعيش حياتك.
              </span>
            </p>

            <div id="tell" className="mt-6 w-full max-w-2xl scroll-mt-28 animate-rise text-start [animation-delay:180ms] sm:mt-7">
              <Suspense fallback={<TellMeFallback />}>
                <TellMe />
              </Suspense>
            </div>
          </div>

          <div className="mt-auto w-full max-w-3xl pt-8 md:max-w-2xl lg:max-w-3xl">
            <PeopleRow />
          </div>
        </div>
        <div className="h-0.5 bg-foreground" aria-hidden />
      </section>

      {/* ── Why «شلونك» ─────────────────────────────────── */}
      <section aria-labelledby="why" className="shell mt-16 md:mt-20">
        <Reveal className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading id="why" eyebrow="ليش شلونك؟" title="كلمة وحدة، بس وراها سؤال كبير" className="mb-4" />
            <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg sm:leading-9">
              «شلونك» كلمة عراقية معناها <span className="font-bold text-foreground">كيف حالك؟</span> — أول شي نسأله
              لأي أحد نحبه. هنا ما نسألها مجاملة: نعطيك مساحة تحچي، وتمارين تفهم بيها نفسك، وناس تمشي وياك.
            </p>
          </div>
          <div className="mt-12 flex justify-center md:mt-0">
            <div className="relative">
              <span className="absolute -top-14 right-0 translate-x-1/3 rounded-2xl rounded-be-sm border-2 whitespace-nowrap border-foreground bg-background px-4 py-2 text-lg font-extrabold shadow-[3px_3px_0_0_var(--foreground)]">
                شلونك اليوم؟
              </span>
              <Character name="curious" className="h-44 w-auto md:h-64" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Pillars ──────────────────────────────────────── */}
      <section aria-labelledby="pillars" className="shell mt-16 md:mt-24">
        <SectionHeading
          id="pillars"
          eyebrow="شنو تلگى هنا"
          title="ثلاث خطوات لحياة أوضح"
          description="ابدأ من وين ما تحب: تمرين قصير، جلسة وياك، أو كورس عملي."
        />
        <Pillars />
      </section>

      {/* ── Voices ───────────────────────────────────────── */}
      <section aria-labelledby="voices" className="shell mt-16 md:mt-24">
        <SectionHeading
          id="voices"
          eyebrow="ناس حچوا"
          title="مو بس إنت تحس هيچ"
          description="مشاركات حقيقية بدون أسماء، بعد موافقة أصحابها ومراجعتها."
          action={
            <Link
              href="#tell"
              className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-4 py-2 text-sm font-bold transition-colors hover:bg-foreground hover:text-background"
            >
              <PencilLineIcon className="size-4" />
              احچي إنت هم
            </Link>
          }
        />
        <PublicPosts />
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section aria-label="ابدأ" className="shell mt-16 md:mt-24">
        <ClosingCta />
      </section>
    </>
  );
}
