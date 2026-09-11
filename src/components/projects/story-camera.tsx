"use client";

import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
  type UseScrollOptions,
} from "motion/react";
import { useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * The case study's camera. One module, one behaviour, two places it is used.
 *
 * A film camera repositions between scenes; it does not orbit. So the only
 * thing this does is drift a layer against the scroll, and settle it as the
 * scene ends — no rotation, no perspective, no easing curve of its own, and
 * never on anything the reader is reading. `<StoryCamera>` puts the cover image
 * behind its own frame and washes it out as the story begins;
 * `useStoryDrift` lends the same move to the depth plane of the two signature
 * chapters, and to nothing else on the page.
 *
 * Keeping it to three scroll-linked elements is the point. Chapters are driven
 * by viewport triggers, which cost nothing per frame; a page that parallaxed
 * every section would be both expensive and seasick.
 *
 * Travel is expressed as a percentage of the element, never in pixels, so a
 * tall desktop cover and a short phone one move by the same *proportion* — and
 * so a caller can size the overscale that hides the drift once and be right at
 * every viewport.
 *
 * Follows `ScrollVeil`'s gate: the transform is applied only after hydration and
 * only when motion is allowed, so the server HTML and the reduced-motion render
 * are the plain, un-transformed layer.
 */

const OFFSET: UseScrollOptions["offset"] = ["start end", "end start"];

/**
 * Phones get the same move at a little over a third of the distance.
 *
 * Not zero: the depth is part of how the page reads, and a cover image that is
 * simply flat on mobile is the "broken desktop version" §13 warns about. But a
 * small screen scrolled with a thumb travels its own height several times a
 * second, and full-distance parallax at that rate is where motion sickness
 * comes from.
 */
const COMPACT_QUERY = "(max-width: 767px)";
const COMPACT_SCALE = 0.4;

function subscribeCompact(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const list = window.matchMedia(COMPACT_QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function compactSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(COMPACT_QUERY).matches;
}

/** Server render assumes the desktop case; the client corrects on hydration —
 *  the same shape as `useMotionPreference` and `use-density.ts`. */
function compactServerSnapshot(): boolean {
  return false;
}

function useCompactViewport(): boolean {
  return useSyncExternalStore(subscribeCompact, compactSnapshot, compactServerSnapshot);
}

/**
 * The element's pass through the viewport, plus whether the camera is allowed
 * to use it.
 *
 * Split out so a caller that needs the raw progress for more than one transform
 * — `<StoryCamera>` drifts the picture *and* settles it — opens one scroll
 * subscription rather than one per effect. `active` is the same gate every
 * motion component here applies: server HTML and the reduced-motion render are
 * the plain, un-transformed layer.
 */
function useStoryScroll(ref: RefObject<HTMLElement | null>) {
  const reducedMotion = useMotionPreference();
  const hydrated = useHydrated();
  const { scrollYProgress } = useScroll({ target: ref, offset: OFFSET });

  return { scrollYProgress, active: hydrated && !reducedMotion };
}

/**
 * A vertical drift of ±`travel` percent across the element's pass through the
 * viewport, or `undefined` when the camera is not allowed to move.
 *
 * Callers spread the result into `style` only when it is defined, so a
 * reduced-motion visitor never gets a `MotionValue` attached at all.
 */
export function useStoryDrift(
  ref: RefObject<HTMLElement | null>,
  travel: number,
): MotionValue<string> | undefined {
  const compact = useCompactViewport();
  const { scrollYProgress, active } = useStoryScroll(ref);

  const distance = compact ? travel * COMPACT_SCALE : travel;
  const y = useTransform(scrollYProgress, [0, 1], [`${-distance}%`, `${distance}%`]);

  return active ? y : undefined;
}

/**
 * The opening shot: the picture drifts inside a frame that does not.
 *
 * The travel is exactly covered by the overscale — at `scale: 1.06` there is 3%
 * of slack on each edge and the drift is 2.5%, so the frame can never show a
 * gap.
 */
const COVER_TRAVEL = 2.5;

/**
 * How the opening shot ends.
 *
 * A hero that holds full brightness until the moment it scrolls off the top is
 * a cut; the reader is looking at the cover and then they are looking at
 * chapter one. The last third of the frame's pass through the viewport washes
 * it toward the page's own ground instead, so the shot settles as the story
 * takes over — the film equivalent of letting a scene fall off rather than
 * splicing out of it.
 *
 * Forty per cent is the ceiling on purpose. Past that the cover reads as
 * disabled rather than as receding, and the reader who scrolls back up should
 * find the picture they arrived on, not a dimmed copy of it.
 */
const SETTLE_RANGE = [0.62, 1] as const;
const SETTLE_DEPTH = 0.4;

export function StoryCamera({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const compact = useCompactViewport();
  const { scrollYProgress, active } = useStoryScroll(ref);

  const distance = compact ? COVER_TRAVEL * COMPACT_SCALE : COVER_TRAVEL;
  const y = useTransform(scrollYProgress, [0, 1], [`${-distance}%`, `${distance}%`]);
  const settle = useTransform(scrollYProgress, [...SETTLE_RANGE], [0, SETTLE_DEPTH]);

  return (
    <div ref={ref} className="absolute inset-0">
      <motion.div className="absolute inset-0" style={active ? { y, scale: 1.06 } : undefined}>
        {children}
      </motion.div>

      {/*
        The settle is a veil in the page's own background colour rather than a
        filter: it composites, it costs nothing to animate, and it means the
        cover fades toward the page instead of toward black. Attached only when
        the camera is allowed to move — a reduced-motion reader gets the frame
        with nothing over it.
      */}
      {active ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-bg"
          style={{ opacity: settle }}
        />
      ) : null}
    </div>
  );
}
