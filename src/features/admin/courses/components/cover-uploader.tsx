"use client";

import { useRef, useState, useTransition } from "react";
import { ImageIcon, ImageUpIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { removeCourseCover, uploadCourseCover } from "../actions";

const TARGET_W = 1280;
const TARGET_H = 720;
const MAX_BYTES = 900_000;

/**
 * Any image from the admin's device → centre-cropped to 16:9, resized to
 * 1280×720 and re-encoded as WebP in the browser (small, fast to serve, strips
 * EXIF). The server re-checks type and size before storing it.
 */
async function prepare(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const ratio = TARGET_W / TARGET_H;
  let sw = bitmap.width;
  let sh = Math.round(sw / ratio);
  if (sh > bitmap.height) {
    sh = bitmap.height;
    sw = Math.round(sh * ratio);
  }
  const sx = Math.round((bitmap.width - sw) / 2);
  const sy = Math.round((bitmap.height - sh) / 2);
  const width = Math.min(TARGET_W, sw);
  const height = Math.round(width / ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.86, 0.76, 0.64, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= MAX_BYTES) return { blob, width, height };
  }
  throw new Error("too-big");
}

export function CoverUploader({ courseId, slug, version, hasUpload }: { courseId: string; slug: string; version: number; hasUpload: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const src = preview ?? `/courses/${encodeURIComponent(slug)}/cover?v=${version}`;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختار ملف صورة.");
      return;
    }
    start(async () => {
      try {
        const { blob, width, height } = await prepare(file);
        const local = URL.createObjectURL(blob);
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return local;
        });
        const form = new FormData();
        form.set("courseId", courseId);
        form.set("file", new File([blob], "cover.webp", { type: "image/webp" }));
        form.set("width", String(width));
        form.set("height", String(height));
        const result = await uploadCourseCover(form);
        if (result.ok) toast.success(result.message ?? "انحفظت الصورة");
        else {
          toast.error(result.error);
          setPreview(null);
        }
      } catch {
        toast.error("ما گدرنا نقرأ الصورة، جرّب صورة ثانية.");
        setPreview(null);
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-muted sm:w-72">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="صورة الغلاف" className="absolute inset-0 size-full object-cover" />
        {pending && (
          <span className="absolute inset-0 grid place-items-center bg-background/60">
            <Spinner className="size-6" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-6 text-muted-foreground">
          {hasUpload || preview ? "صورة مرفوعة." : "حالياً تنعرض صورة أول فيديو YouTube (أو صورة افتراضية)."} أي صورة من جهازك: تنقص تلقائياً
          بنسبة 16:9 وتتصغّر.
        </p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
          aria-label="اختيار صورة الغلاف"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
            {pending ? <Spinner /> : hasUpload ? <ImageIcon /> : <ImageUpIcon />}
            {hasUpload || preview ? "تغيير الصورة" : "رفع صورة"}
          </Button>
          {(hasUpload || preview) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await removeCourseCover(courseId);
                  if (result.ok) {
                    setPreview(null);
                    toast.success(result.message ?? "انشالت الصورة");
                  } else toast.error(result.error);
                })
              }
            >
              <Trash2Icon /> شيل الصورة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
