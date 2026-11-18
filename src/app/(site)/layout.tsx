import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { GyroscopeCursor } from "@/components/motion/gyroscope-cursor";
import { LoginDialog } from "@/features/auth/components/login-dialog";
import { features } from "@/lib/env";

/**
 * Public site shell. The black brand cursor (white outline, so it stays visible on
 * black sections) applies to mouse/trackpad only; touch, text fields and
 * "reduce motion" keep native behaviour. The admin area keeps the normal cursor.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <GyroscopeCursor color="#111111" outlineColor="#FFFFFF" size={22} outlineWidth={2.5} className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:top-3 focus:start-3"
      >
        تخطَّ إلى المحتوى
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <LoginDialog googleEnabled={features.supabaseAuth} devLoginEnabled={features.devLogin} />
    </GyroscopeCursor>
  );
}
