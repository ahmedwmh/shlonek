"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { isActivePath, mainNav } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="فتح القائمة">
          <MenuIcon className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[82vw] max-w-xs border-s-2 border-foreground">
        <SheetHeader>
          <SheetTitle>
            <Logo className="h-5 w-auto" />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="التنقل الرئيسي" className="px-4">
          <ul className="flex flex-col gap-1">
            {mainNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-lg font-semibold transition-colors",
                      active ? "bg-foreground text-background" : "hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
