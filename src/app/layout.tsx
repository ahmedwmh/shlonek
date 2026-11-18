import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2 } from "next/font/google";
import { Providers } from "@/components/providers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * Temporary brand font. The final Arabic font is KunKun Arabic (ITF, commercial
 * web licence pending) — swap this for `next/font/local` once the WOFF2 files arrive.
 */
const brandFont = Baloo_Bhaijaan_2({
  variable: "--font-brand",
  subsets: ["arabic", "latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — شلونك؟`, template: "%s · شلونك" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["شلونك", "لايف كوتشينج", "تطوير ذات", "استشارات نفسية", "تمارين", "العراق", "life coaching", "Iraq"],
  alternates: { canonical: "/" },
  openGraph: { siteName: SITE_NAME, locale: "ar_IQ", type: "website", url: "/", title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${brandFont.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
