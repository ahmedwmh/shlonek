export const mainNav = [
  { href: "/", label: "شلونك" },
  { href: "/consultations", label: "الاستشارات" },
  { href: "/exercises", label: "التمارين" },
  { href: "/courses", label: "الكورسات" },
  { href: "/about", label: "من إحنا" },
] as const;

export const isActivePath = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
