"use client";

import { m } from "motion/react";
import { QuoteIcon } from "lucide-react";

type Post = { id: string; text: string };

const tilts = [-1.5, 1, -0.5, 1.5, -1, 0.5];

/**
 * Anonymous public posts as calm "bubbles". Only text — no names, links or
 * timestamps. Float animation is CSS (GPU transform), staggered, paused on hover,
 * and disabled by prefers-reduced-motion in globals.css.
 */
export function PublicBubbles({ posts }: { posts: Post[] }) {
  return (
    <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
      {posts.map((post, i) => (
        <m.li
          key={post.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: (i % 3) * 0.08, type: "spring", stiffness: 200, damping: 26 }}
          className="break-inside-avoid"
        >
          <figure
            className="group relative animate-float rounded-[1.75rem] rounded-ee-md border-2 border-foreground bg-card p-5 transition-transform duration-300 hover:[animation-play-state:paused]"
            style={{ animationDelay: `${(i * 0.9) % 5}s`, rotate: `${tilts[i % tilts.length]}deg` }}
          >
            <QuoteIcon className="mb-2 size-5 -scale-x-100 text-muted-foreground" aria-hidden />
            <blockquote className="line-clamp-[8] text-[0.95rem] leading-7 whitespace-pre-line">{post.text}</blockquote>
          </figure>
        </m.li>
      ))}
    </ul>
  );
}
