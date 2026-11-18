"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type SelectFilter = { name: string; label: string; options: { value: string; label: string }[] };

const ALL = "__all";

/** Filters that live in the URL (shareable, back-button friendly). */
export function UrlFilters({ selects = [], search }: { selects?: SelectFilter[]; search?: { name: string; placeholder: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(search ? (params.get(search.name) ?? "") : "");

  const update = (name: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Debounced search.
  useEffect(() => {
    if (!search) return;
    const current = params.get(search.name) ?? "";
    if (q === current) return;
    const t = setTimeout(() => update(search.name, q.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the typed value
  }, [q]);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {search && (
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={search.placeholder}
            className="h-10 rounded-full bg-card ps-9"
            aria-label={search.placeholder}
          />
        </div>
      )}
      {selects.map((s) => {
        const current = params.get(s.name);
        const chosen = s.options.find((o) => o.value === current)?.label;
        return (
        <Select key={s.name} value={current ?? ALL} onValueChange={(v) => update(s.name, v === ALL ? null : v)} dir="rtl">
          <SelectTrigger className="h-10 w-44 rounded-full bg-card" aria-label={s.label}>
            {/* Explicit text so the trigger is never blank before the menu has opened. */}
            <SelectValue>
              {chosen ? (
                <span>
                  <span className="text-muted-foreground">{s.label}:</span> {chosen}
                </span>
              ) : (
                <span className="text-muted-foreground">{s.label}: الكل</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{s.label}: الكل</SelectItem>
            {s.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        );
      })}
      {pending && <Spinner className="text-muted-foreground" />}
    </div>
  );
}
