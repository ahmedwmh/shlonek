"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowUpIcon, CheckIcon, PencilLineIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useRequestId } from "@/hooks/use-request-id";
import { useAuthGate } from "@/features/auth/hooks/use-auth-gate";
import { submitPost } from "../actions";
import { POST_MAX, POST_MIN } from "../schema";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * «احچيلي». Compact field for everyone; after sign-in it grows into a multi-line
 * area with a counter and an opt-in (unchecked) consent for anonymous publishing.
 * On error the text stays put; a local draft survives reloads.
 */
export function TellMeBox({ isSignedIn }: { isSignedIn: boolean }) {
  const gate = useAuthGate(isSignedIn);
  const requestId = useRequestId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ids = { field: useId(), hint: useId(), consent: useId() };

  const [body, setBody, clearBody] = usePersistentState("shlonek:tell-me-draft", "", "session");
  const [consent, setConsent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const length = body.trim().length;
  const tooShort = length < POST_MIN;
  const canSend = !tooShort && length <= POST_MAX && status !== "submitting";

  /** Expands the box and puts the caret at the end of any draft. */
  const expandWith = () => {
    setExpanded(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  // Coming back from login with ?tell=1: open the box and focus it.
  useEffect(() => {
    if (!isSignedIn) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tell") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the sign-in return URL once
      expandWith();
      params.delete("tell");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}#tell`);
    }
     
  }, [isSignedIn]);

  const open = () => {
    if (!gate({ next: "/?tell=1", reason: "حتى تكتب وتحچي، لازم تسجّل دخولك أول. ما راح يظهر اسمك لأي أحد." })) return;
    expandWith();
  };

  const send = () => {
    if (!canSend) return;
    setStatus("submitting");
    setError(null);
    startTransition(async () => {
      const result = await submitPost({ body, publishConsent: consent, clientRequestId: requestId.get() });
      if (result.ok) {
        requestId.renew();
        clearBody();
        setConsent(false);
        setStatus("success");
      } else {
        setStatus("error");
        setError(result.error);
      }
    });
  };

  if (status === "success") {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="sketch-card flex flex-col items-center gap-3 p-8 text-center"
        role="status"
      >
        <m.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
          className="grid size-12 place-items-center rounded-full bg-foreground text-background"
        >
          <CheckIcon className="size-6" />
        </m.span>
        <p className="text-xl font-bold">وصلت رسالتك</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          شكراً لأنك حچيت. تگدر تتابع رسالتك من «مشاركاتي». إذا وافقت على النشر، راح نراجعها قبل ما تنعرض بدون اسمك.
        </p>
        <div className="mt-2 flex gap-2">
          <Button asChild variant="outline" className="rounded-full border-2 border-foreground">
            <Link href="/account/posts">مشاركاتي</Link>
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => setStatus("idle")}>
            اكتب رسالة ثانية
          </Button>
        </div>
      </m.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
    <m.div
      layout
      className={cn(
        "sketch-card overflow-hidden",
        !expanded &&
          "transition-[translate,box-shadow] duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)] active:translate-0 active:shadow-[2px_2px_0_0_var(--foreground)]",
      )}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {!expanded ? (
          <m.button
            key="collapsed"
            type="button"
            onClick={open}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="group flex w-full cursor-text items-center gap-3 px-5 py-4 text-start"
            aria-label="احچيلي — اكتب شلونك"
          >
            <PencilLineIcon className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="flex-1 text-lg text-muted-foreground transition-colors group-hover:text-foreground">
              احچيلي، شلونك اليوم؟
            </span>
            <span className="hidden text-sm font-semibold sm:inline">اكتب هنا</span>
            <span className="grid size-10 place-items-center rounded-full bg-foreground text-background transition-transform group-hover:scale-105">
              <ArrowUpIcon className="size-5" />
            </span>
          </m.button>
        ) : (
          <m.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3 p-5"
          >
            <label htmlFor={ids.field} className="text-lg font-bold">
              احچيلي
            </label>
            <textarea
              ref={textareaRef}
              id={ids.field}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              maxLength={POST_MAX}
              rows={5}
              aria-describedby={ids.hint}
              aria-invalid={status === "error" || undefined}
              placeholder="اكتب اللي بقلبك… شنو اللي شاغلك؟"
              className="field-sizing-content max-h-80 min-h-32 w-full resize-none bg-transparent text-base leading-8 outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground" id={ids.hint}>
              <span>تجنّب كتابة أسماء أو أرقام أو عناوين.</span>
              <span dir="ltr" className={cn("tabular-nums", length > POST_MAX * 0.9 && "text-foreground")}>
                {length}/{POST_MAX}
              </span>
            </div>

            <label
              htmlFor={ids.consent}
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted p-3 text-sm leading-relaxed"
            >
              <Checkbox
                id={ids.consent}
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-1"
              />
              <span>أوافق على عرض نصّي بعد المراجعة بدون هوية. (اختياري — تگدر تسحب موافقتك بأي وقت)</span>
            </label>

            <AnimatePresence>
              {status === "error" && error && (
                <m.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="flex items-center gap-2 text-sm text-destructive"
                >
                  {error}
                </m.p>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" className="rounded-full" onClick={() => setExpanded(false)}>
                إغلاق
              </Button>
              <Button onClick={send} disabled={!canSend} className="h-11 rounded-full px-6 text-base">
                {status === "submitting" ? (
                  <Spinner />
                ) : status === "error" ? (
                  <RotateCcwIcon />
                ) : (
                  <ArrowUpIcon />
                )}
                {status === "error" ? "إعادة المحاولة" : "إرسال"}
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>

    </div>
  );
}
