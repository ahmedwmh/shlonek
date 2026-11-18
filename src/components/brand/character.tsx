import { cn } from "@/lib/utils";

/**
 * One character cropped out of the shared `people.svg` with an SVG viewBox, so all
 * five characters come from a single cached file (no extra downloads).
 */
const SOURCE = { width: 1287.34, height: 645.71 };

/**
 * [x, width] of each crop, plus a clip polygon (source coordinates) that trims
 * neighbouring characters' hands where the drawings overlap.
 */
export type CharacterName = "welcoming" | "relaxed" | "curious" | "helpful" | "thinking";

const crops: Record<CharacterName, { x: number; width: number; clip?: string }> = {
  /** Hijabi girl, arms open — welcoming. */
  welcoming: { x: 0, width: 345, clip: "0,0 345,0 345,235 334,235 334,646 0,646" },
  /** Girl with a bun, hands in pockets — relaxed. */
  relaxed: { x: 334, width: 240, clip: "345,0 574,0 574,646 334,646 334,235 345,235" },
  /** Surprised girl — curious. */
  curious: { x: 596, width: 185 },
  /** Curly-haired boy reaching out — helpful. */
  helpful: { x: 822, width: 248, clip: "822,0 1048,0 1048,130 1070,130 1070,646 822,646" },
  /** Worried boy with a scribble — thinking. */
  thinking: { x: 1050, width: 237.34, clip: "1050,0 1287.34,0 1287.34,646 1074,646 1074,150 1050,150" },
};

type Props = { name: CharacterName; className?: string; label?: string };

export function Character({ name, className, label }: Props) {
  const { x, width, clip } = crops[name];
  const clipId = `character-clip-${name}`;
  return (
    <svg
      viewBox={`${x} 0 ${width} ${SOURCE.height}`}
      className={cn("h-auto", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {clip && (
        <clipPath id={clipId}>
          <polygon points={clip} />
        </clipPath>
      )}
      <image
        href="/brand/people.svg"
        width={SOURCE.width}
        height={SOURCE.height}
        clipPath={clip ? `url(#${clipId})` : undefined}
      />
    </svg>
  );
}

/** The full group of five characters. */
export function People({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG; next/image adds nothing for vectors
    <img
      src="/brand/people.svg"
      alt="خمس شخصيات مرسومة بالأسود والأبيض: طلاب يحملون حقائب، بعضهم فرحان وبعضهم يفكر"
      width={1287}
      height={646}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("h-auto w-full select-none", className)}
      draggable={false}
    />
  );
}
