import Link from "next/link";
import { Character } from "@/components/brand/character";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

/**
 * Black closing band. The characters sit on white discs: their "white" areas are
 * transparent and must never be drawn straight onto a dark background.
 */
export function ClosingCta() {
  return (
    <Reveal className="relative overflow-hidden rounded-[2rem] bg-foreground px-5 py-10 text-background sm:px-6 sm:py-12 md:px-12 md:py-14">
      <div className="relative z-10 flex flex-col items-start gap-5 md:max-w-xl">
        <h2 className="text-2xl leading-tight font-extrabold sm:text-3xl md:text-5xl">جاهز تبدي؟</h2>
        <p className="text-base leading-7 text-background/75 sm:text-lg sm:leading-8">
          ابدأ بتمرين قصير مجاني، أو احجز جلسة وخلّينا نمشي ويا بعض خطوة بخطوة.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-6 text-base">
            <Link href="/exercises">ابدأ تمرين مجاني</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-2 border-background bg-transparent px-6 text-base text-background hover:bg-background hover:text-foreground"
          >
            <Link href="/consultations">احجز استشارة</Link>
          </Button>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-10 -left-6 hidden items-end gap-3 md:flex" aria-hidden>
        <span className="grid size-44 place-items-end justify-center overflow-hidden rounded-full bg-background">
          <Character name="helpful" className="h-40 w-auto translate-y-3" />
        </span>
        <span className="grid size-56 place-items-end justify-center overflow-hidden rounded-full bg-background">
          <Character name="welcoming" className="h-52 w-auto translate-y-4" />
        </span>
      </div>
    </Reveal>
  );
}
