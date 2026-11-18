"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CrownIcon, LayoutDashboardIcon, LogOutIcon, UserIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "../actions";
import { useAuthDialog } from "../store";

type Props = { name: string; isStaff: boolean; isPremium: boolean };

export function AccountMenu({ name, isStaff, isPremium }: Props) {
  // This menu only renders once signed in: close a login dialog left open across
  // the soft navigation that follows sign-in (e.g. returning to the same page).
  useEffect(() => {
    useAuthDialog.getState().setOpen(false);
  }, []);

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 rounded-full border-2 border-foreground px-4">
          <UserIcon className="size-4" />
          <span className="font-semibold">حسابي</span>
          {isPremium && (
            <span className="grid size-5 place-items-center rounded-full bg-foreground text-background" aria-label="بريميوم">
              <CrownIcon className="size-3" strokeWidth={2.5} />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account">
              <UserIcon /> حسابي
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/wallet">
              <WalletIcon /> محفظتي
            </Link>
          </DropdownMenuItem>
          {isStaff && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboardIcon /> لوحة الإدارة
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <SignOutItem />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Keeps the menu open while signing out so the spinner is visible. */
function SignOutItem() {
  const { pending } = useFormStatus();
  return (
    <DropdownMenuItem asChild disabled={pending} onSelect={(e) => e.preventDefault()}>
      <button type="submit" className="w-full" aria-busy={pending}>
        {pending ? <Spinner /> : <LogOutIcon className="rtl:-scale-x-100" />} تسجيل الخروج
      </button>
    </DropdownMenuItem>
  );
}
