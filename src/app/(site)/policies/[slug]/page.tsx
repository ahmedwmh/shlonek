import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";
import { formatShortDate } from "@/lib/format";
import { getLatestPolicy, policySlugs, type PolicySlug } from "@/features/policies/queries";

export function generateStaticParams() {
  return Object.keys(policySlugs).map((slug) => ({ slug }));
}

const isSlug = (s: string): s is PolicySlug => s in policySlugs;

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return {};
  const policy = await getLatestPolicy(policySlugs[slug]);
  return { title: policy?.title ?? "السياسات" };
}

async function Policy({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const policy = await getLatestPolicy(policySlugs[slug]);
  if (!policy) notFound();

  return (
    <article>
      <h1 className="text-3xl font-bold">{policy.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        الإصدار {policy.version} · {formatShortDate(policy.publishedAt)}
      </p>
      <div className="mt-8 leading-8 whitespace-pre-line">{policy.body}</div>
    </article>
  );
}

export default function PolicyPage(props: PageProps<"/policies/[slug]">) {
  return (
    <div className="shell max-w-3xl py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Policy {...props} />
      </Suspense>
    </div>
  );
}
