import Link from "next/link";
import { cacheLife } from "next/cache";
import { Logo } from "@/components/brand/logo";
import { getSettings } from "@/features/settings/queries";
import { mainNav } from "./nav-items";
import { safeMailto, safeTel } from "@/lib/safe-url";
import { CurrentYear } from "./current-year";

const policyLinks = [
  { href: "/policies/privacy", label: "الخصوصية" },
  { href: "/policies/terms", label: "شروط الاستخدام" },
  { href: "/policies/booking", label: "سياسة الحجز" },
  { href: "/policies/payment", label: "سياسة الدفع" },
];

export async function SiteFooter() {
  "use cache";
  cacheLife("hours");
  const contact = await getSettings("contact");
  const tel = safeTel(contact.phone);
  const mail = safeMailto(contact.email);

  return (
    <footer className="mt-16 border-t-2 border-foreground md:mt-20">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo className="h-6 w-auto self-start" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            اعرف نفسك، اختار بوعي، وعيش حياتك. منصة لايف كوتشينج تفاعلية من العراق.
          </p>
          {(tel || mail) && (
            <ul className="flex flex-col gap-1 text-sm">
              {tel && (
                <li>
                  <a href={tel} dir="ltr" className="hover:underline">
                    {contact.phone}
                  </a>
                </li>
              )}
              {mail && (
                <li>
                  <a href={mail} dir="ltr" className="hover:underline">
                    {contact.email}
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
        <nav aria-label="روابط الموقع">
          <h2 className="mb-3 text-sm font-bold">الموقع</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="السياسات">
          <h2 className="mb-3 text-sm font-bold">السياسات</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {policyLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="shell border-t py-5 text-xs text-muted-foreground">© <CurrentYear /> شلونك.com</p>
    </footer>
  );
}
