import type { ReactNode } from "react";

import { ScrollVeil, type VeilVariant } from "@/components/motion/scroll-veil";
import type { SectionTone } from "@/lib/constants/section-tone";
import { cn } from "@/lib/utils/cn";

/**
 * Landmark wrapper for every public section.
 *
 * Owns four things so no individual section has to remember them: the anchor id
 * used by the nav, the `aria-labelledby` wiring to its own `<h2>`, the vertical
 * rhythm, and — via `tone` — the section's colour identity plus the scroll-linked
 * transition that carries it in and out of the viewport.
 *
 * The veil wraps the *inner* container rather than the `<section>` itself. Its
 * transform would otherwise turn the section into a containing block, which
 * quietly breaks `position: sticky` and `position: fixed` for anything nested
 * inside it. `scroll-mt` stays on the untransformed element so anchor jumps
 * still land under the fixed header.
 */

interface SectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  /** Set false when the section labels itself some other way. */
  labelled?: boolean;
  /** Colour identity — also what the animated background tints itself with. */
  tone?: SectionTone;
  /** Set false on the final section of a page; see `ScrollVeil`. */
  exit?: boolean;
  /** Override the tone's default entrance. */
  variant?: VeilVariant;
}

/**
 * One entrance per tone, so scrolling the page is not the same fade-up six
 * times. The mapping lives here rather than in each section because it is a
 * property of the page's rhythm — no two neighbours should share a variant —
 * and that is only visible when they are listed together.
 */
const TONE_VARIANTS: Record<SectionTone, VeilVariant> = {
  // The hero runs its own entrance (boot loader, then the world assembling), so
  // the veil only has to get out of its way on the way out.
  hero: "fade",
  about: "rise",
  // The galaxy opens outward from its centre; the section does the same.
  stack: "expand",
  // Cartridges hinge up out of the cabinet.
  work: "tilt",
  // The timeline dollies forward, so its section arrives from ahead of you.
  experience: "settle",
  // The last one comes in slightly too close, like a channel pulling focus.
  contact: "zoom",
};

/** Heading id convention shared with `<SectionHeading id={headingId(...)}>`. */
export function headingId(sectionId: string): string {
  return `${sectionId}-heading`;
}

export function Section({
  id,
  children,
  className,
  labelled = true,
  tone,
  exit = true,
  variant,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelled ? headingId(id) : undefined}
      data-tone={tone}
      // The attribute the ambient background observes. Kept separate from
      // `data-tone` so the background's own element — which also carries a tone
      // — can never observe itself.
      data-tone-anchor={tone ? "" : undefined}
      className={cn("scroll-mt-24 py-20 sm:py-28", className)}
    >
      <ScrollVeil
        exit={exit}
        variant={variant ?? (tone ? TONE_VARIANTS[tone] : "rise")}
        className="container-page"
      >
        {children}
      </ScrollVeil>
    </section>
  );
}
