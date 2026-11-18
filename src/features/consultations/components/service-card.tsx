import Link from "next/link";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIQD, pluralizeSessions } from "@/lib/format";

type Props = {
  service: {
    id: string;
    kind: "SINGLE" | "PACKAGE";
    title: string;
    description: string;
    sessionsCount: number;
    durationMinutes: number;
    price: number;
    deliveryMethod: "ONLINE" | "IN_PERSON";
    deliveryNote: string | null;
  };
  featured?: boolean;
};

export function ServiceCard({ service, featured }: Props) {
  const points = [
    pluralizeSessions(service.sessionsCount),
    service.kind === "PACKAGE" ? "جلسة وحدة كل أسبوع" : "موعد واحد تختاره أنت",
    `${service.durationMinutes} دقيقة للجلسة`,
    service.deliveryMethod === "ONLINE" ? "أونلاين" : "حضوري",
  ];

  return (
    <article
      className={
        featured
          ? "sketch-card flex h-full flex-col gap-5 bg-foreground p-7 text-background [box-shadow:4px_4px_0_0_var(--foreground)]"
          : "sketch-card flex h-full flex-col gap-5 p-7"
      }
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">{service.title}</h2>
        <p className={featured ? "leading-7 text-background/75" : "leading-7 text-muted-foreground"}>{service.description}</p>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <CheckIcon className="size-4 shrink-0" /> {p}
          </li>
        ))}
      </ul>
      {service.deliveryNote && (
        <p className={featured ? "text-sm text-background/70" : "text-sm text-muted-foreground"}>{service.deliveryNote}</p>
      )}
      <div className="flex items-end justify-between gap-4">
        <p className="text-3xl font-extrabold">{formatIQD(service.price)}</p>
        <Button
          asChild
          variant={featured ? "secondary" : "default"}
          className="h-12 rounded-full px-6 text-base"
        >
          <Link href={`/consultations/${service.id}`}>
            {service.kind === "PACKAGE" ? "احجز الباقة" : "احجز جلسة"}
            <ArrowLeftIcon />
          </Link>
        </Button>
      </div>
    </article>
  );
}
