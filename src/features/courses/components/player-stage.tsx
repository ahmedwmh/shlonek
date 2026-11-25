"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CrownIcon, LockIcon, PlayIcon, RotateCcwIcon, VideoOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthGate } from "@/features/auth/hooks/use-auth-gate";
import { cn } from "@/lib/utils";
import type { Gate } from "../access";
import { startPlayback, type Playback } from "../actions";
import { PLAY_EVENT, PLAYING_EVENT } from "../cover";
import { BuyCourseButton } from "./course-buttons";

const frame = "absolute inset-0 size-full border-0";

/**
 * The main video area. Shows the cover with a play button; pressing play asks
 * the server (which re-checks access) for the video, then swaps in the player.
 * Nothing heavy loads until then, and locked viewers see why plus one next step.
 */
export function PlayerStage({
  courseId,
  lessonId,
  title,
  poster,
  gate,
  isSignedIn,
  priority = false,
}: {
  courseId: string;
  lessonId: string;
  title: string;
  poster: string;
  gate: Gate;
  isSignedIn: boolean;
  priority?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockedBy, setLockedBy] = useState<Gate>(gate);
  const [pending, start] = useTransition();

  const play = useCallback(() => {
    if (lockedBy !== "ok" || playback) return;
    setError(null);
    start(async () => {
      const result = await startPlayback(courseId, lessonId);
      if (result.ok) {
        setPlayback(result.data);
        window.dispatchEvent(new CustomEvent(PLAYING_EVENT, { detail: lessonId }));
      }
      else if ("gate" in result) setLockedBy(result.gate);
      else setError(result.error);
    });
  }, [courseId, lessonId, lockedBy, playback]);

  // The action card's "watch" button plays this video without leaving the page.
  useEffect(() => {
    const onPlay = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== lessonId) return;
      box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      play();
    };
    window.addEventListener(PLAY_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_EVENT, onPlay);
  }, [lessonId, play]);

  return (
    <div
      ref={box}
      className="relative aspect-video w-full overflow-hidden rounded-3xl border-2 border-foreground bg-foreground shadow-[6px_6px_0_0_var(--foreground)]"
    >
      {playback ? (
        playback.provider === "YOUTUBE" ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(playback.videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={title}
            className={frame}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <iframe
            src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(playback.otp)}&playbackInfo=${encodeURIComponent(playback.playbackInfo)}`}
            title={title}
            className={frame}
            allow="encrypted-media; autoplay; fullscreen"
            allowFullScreen
          />
        )
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            className={cn("absolute inset-0 size-full object-cover transition-[filter,opacity] duration-300", lockedBy !== "ok" && "opacity-40 blur-[2px]")}
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          {lockedBy === "ok" ? (
            <button
              type="button"
              onClick={play}
              disabled={pending}
              aria-label={`تشغيل: ${title}`}
              className="group absolute inset-0 grid place-items-center outline-none"
            >
              <span className="grid size-20 place-items-center rounded-full bg-background text-foreground shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] transition-transform duration-200 group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-background/60 group-active:scale-95 md:size-24">
                {pending ? <Spinner className="size-8" /> : <PlayIcon className="size-8 translate-x-[-2px] fill-current md:size-10" />}
              </span>
            </button>
          ) : (
            <Locked gate={lockedBy} courseId={courseId} isSignedIn={isSignedIn} />
          )}
          {error && (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-background/95 px-4 py-3 text-sm">
              <span className="flex items-center gap-2">
                <VideoOffIcon className="size-4 shrink-0" /> {error}
              </span>
              <Button size="sm" variant="ghost" onClick={play}>
                <RotateCcwIcon /> إعادة
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Locked({ gate, courseId, isSignedIn }: { gate: Exclude<Gate, "ok">; courseId: string; isSignedIn: boolean }) {
  const signIn = useAuthGate(false);
  const text =
    gate === "login"
      ? "سجّل دخولك حتى تشاهد. التسجيل مجاني."
      : gate === "premium"
        ? "هذا المحتوى لمشتركي بريميوم."
        : gate === "closed"
          ? "هذا المحتوى ما عاد متاح."
          : "هذا الفيديو ينفتح بعد شراء الكورس.";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-background">
      <span className="grid size-14 place-items-center rounded-full bg-background text-foreground">
        {gate === "premium" ? <CrownIcon className="size-6" /> : <LockIcon className="size-6" />}
      </span>
      <p className="max-w-sm text-base leading-7 font-semibold drop-shadow md:text-lg">{text}</p>
      <div className="w-full max-w-60">
        {gate === "login" && (
          <Button variant="secondary" className="h-11 w-full rounded-full" onClick={() => signIn({ reason: text })}>
            سجّل دخولك
          </Button>
        )}
        {gate === "premium" && (
          <Button asChild variant="secondary" className="h-11 w-full rounded-full">
            <Link href="/premium">اشترك ببريميوم</Link>
          </Button>
        )}
        {gate === "buy" && (
          <BuyCourseButton courseId={courseId} isSignedIn={isSignedIn} variant="secondary">
            اشتري الكورس
          </BuyCourseButton>
        )}
      </div>
    </div>
  );
}
