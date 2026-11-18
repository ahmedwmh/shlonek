import Link from "next/link";
import { Character } from "@/components/brand/character";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="shell flex min-h-dvh flex-col items-center justify-center gap-5 py-16 text-center">
      <Link href="/" aria-label="شلونك.com — الرئيسية">
        <Logo className="h-6 w-auto" />
      </Link>
      <Character name="thinking" className="h-44 w-auto" />
      <h1 className="text-3xl font-bold">ضعنا شوية…</h1>
      <p className="max-w-sm text-muted-foreground">الصفحة اللي تدور عليها مو موجودة، أو انشالت.</p>
      <Button asChild className="h-11 rounded-full px-6">
        <Link href="/">ارجع للرئيسية</Link>
      </Button>
    </main>
  );
}
