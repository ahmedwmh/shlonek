import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Character } from "@/components/brand/character";
import { SubmitButton } from "@/components/submit-button";
import { requireViewer } from "@/lib/auth/dal";
import { safeNext } from "@/lib/safe-next";
import { acceptTerms } from "@/features/auth/actions";
import { getCurrentTermsVersion } from "@/features/policies/queries";

export const metadata: Metadata = { title: "أهلاً بيك", robots: { index: false } };

async function WelcomeContent({ searchParams }: PageProps<"/welcome">) {
  const next = safeNext((await searchParams).next);
  const viewer = await requireViewer(`/welcome?next=${encodeURIComponent(next)}`);
  if (viewer.termsVersion === (await getCurrentTermsVersion())) redirect(next);

  return (
    <form action={acceptTerms} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <h1 className="text-2xl font-bold">أهلاً {viewer.name.split(" ")[0]}، قبل ما نبدي</h1>
      <ul className="flex list-disc flex-col gap-2 ps-5 leading-7 text-muted-foreground">
        <li>اسمك وبريدك يبقون خاصين، وما ينعرضون للناس أبداً.</li>
        <li>اللي تكتبه بـ«احچيلي» يوصل لفريق شلونك فقط. ما ينعرض للعامة إلا إذا وافقت، وبعد مراجعة وحذف أي شي يكشفك.</li>
        <li>إجاباتك بالتمارين ونتائجك خاصة بيك وبالفريق المخوّل فقط.</li>
      </ul>
      <p className="text-sm">
        بالمتابعة توافق على{" "}
        <Link href="/policies/privacy" className="font-semibold underline">
          سياسة الخصوصية
        </Link>{" "}
        و
        <Link href="/policies/terms" className="font-semibold underline">
          شروط الاستخدام
        </Link>
        .
      </p>
      <SubmitButton size="lg" className="h-12 rounded-full text-base">
        موافق، يلا نبدي
      </SubmitButton>
    </form>
  );
}

export default function WelcomePage(props: PageProps<"/welcome">) {
  return (
    <div className="shell flex justify-center py-16">
      <div className="sketch-card flex w-full max-w-lg flex-col gap-6 p-8">
        <Character name="helpful" className="h-28 w-auto self-center" />
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
          <WelcomeContent {...props} />
        </Suspense>
      </div>
    </div>
  );
}
