"use client";

import { useTransition, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthGate } from "@/features/auth/hooks/use-auth-gate";
import { cn } from "@/lib/utils";
import { createCourseOrder, joinCourse } from "../actions";
import { PLAY_EVENT } from "../cover";

const big = "h-12 w-full rounded-full text-base";

/**
 * Free course/workshop: adds it to «كورساتي» (once), then either plays the
 * page's main video in place (`playLessonId`) or opens the first lesson (`href`).
 */
export function WatchButton({
  courseId,
  enrolled,
  href,
  playLessonId,
  isSignedIn,
  children,
}: {
  courseId: string;
  enrolled: boolean;
  href: string;
  playLessonId?: string;
  isSignedIn: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const gate = useAuthGate(isSignedIn);
  const [pending, start] = useTransition();
  return (
    <Button
      className={big}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (!gate({ reason: "سجّل دخولك حتى تبدأ. التسجيل مجاني." })) return;
        start(async () => {
          if (!enrolled) {
            const result = await joinCourse(courseId);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
          }
          if (playLessonId) {
            window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: playLessonId }));
            router.refresh();
          } else router.push(href);
        });
      }}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

/** Starts checkout for a paid course at the server-computed price. */
export function BuyCourseButton({
  courseId,
  isSignedIn,
  children,
  variant,
  className,
}: {
  courseId: string;
  isSignedIn: boolean;
  children: ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const router = useRouter();
  const gate = useAuthGate(isSignedIn);
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      className={cn(big, className)}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (!gate({ reason: "سجّل دخولك حتى تشتري الكورس." })) return;
        start(async () => {
          const result = await createCourseOrder(courseId);
          if (result.ok) router.push(`/checkout/${result.data.orderId}`);
          else toast.error(result.error);
        });
      }}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

/** Opens the login dialog and comes back here. */
export function SignInButton({ reason, children }: { reason: string; children: ReactNode }) {
  const gate = useAuthGate(false);
  return (
    <Button className={big} onClick={() => gate({ reason })}>
      {children}
    </Button>
  );
}
