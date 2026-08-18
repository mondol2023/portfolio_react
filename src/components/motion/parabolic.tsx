"use client";

import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
  type UseScrollOptions,
} from "motion/react";
import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Parabolic scroll sweep.
 *
 * Content sits still — opacity 1, no offset — while comfortably on screen. As
 * it approaches the top of the viewport it arcs up and to the left and fades,
 * as if swept off the page. The arc is driven by continuous scroll progress
 * rather than an enter/exit event, so scrolling back up replays the same arc
 * backwards with no separate reverse logic to write.
 *
 * The one thing that has to be right here is the *scroll window*: how many
 * pixels of scrolling the arc is spread over. The obvious window — from "my
 * top edge hits the viewport top" to "my bottom edge hits the viewport top" —
 * is exactly the element's own height, which works for a 400px card and is
 * useless for a 40px letter: the whole arc plays out in 40px of scrolling,
 * while the letter is already scraping the top edge. Hence two windows:
 *
 *   `sm` — anchored to the viewport, not the element. Runs from "my top edge
 *          is halfway up the screen" to "my top edge reaches the top", i.e.
 *          half a viewport of scrolling no matter how small the thing is.
 *          Letters, words, tech pills.
 *   `lg` — anchored to the element, for content taller than that window is
 *          long. Starts at the same place and finishes as the element's
 *          bottom clears the top, so a tall card is never left mid-flight.
 *
 * Both are monotonic for any element height, which `useTransform` requires.
 *
 * Cascade: items on one line share a top edge, so tracking position alone
 * would sweep them in unison. `index`/`total` slice the window into
 * overlapping per-item sub-windows instead, in DOM order — the leftmost item
 * of the first line leaves first and the wave travels rightward, then drops to
 * the next line and crosses it the same way. Reading order is already line
 * order, so nothing here has to measure where the lines actually break.
 *
 * Progress is measured once per group, not once per item: a heading is ~40
 * letters and a marquee row ~30 pills, and that many scroll subscriptions all
 * calling `getBoundingClientRect` would cost more than the animation is worth.
 * `<ParabolicText>` measures its own wrapper; other groups use
 * `useParabolicProgress` + `<ParabolicGroup>`. A lone `<ParabolicItem>` with
 * no group above it falls back to measuring itself.
 *
 * This only governs the sweep-away-and-back; first-time entrances (Reveal,
 * Stagger, Curtain) are untouched — an item starts fully in place and only
 * reacts once its host has settled.
 */

type SweepSize = "sm" | "lg";

const WINDOW: Record<SweepSize, UseScrollOptions["offset"]> = {
  sm: ["start 50%", "start start"],
  lg: ["start 40%", "end start"],
};

/**
 * Shape of the arc across one item's sub-window. Rises quickly, peaks past the
 * three-quarter mark, then falls away — a thrown object, not a lift.
 */
const CURVE = [0, 0.35, 0.7, 1];

/**
 * Share of the window spent staggering the cascade; the rest is one item's own
 * flight. Higher means a longer wave and a quicker individual arc. Most of the
 * window goes to the stagger on purpose: with the two roughly even the items
 * overlap so heavily that a long line reads as leaving all at once, and the
 * point of the effect is watching it travel.
 */
const CASCADE = 0.72;

/** The slice of the group's window during which one item flies. */
function subWindow(index: number, total: number): { from: number; to: number } {
  if (total <= 1) return { from: 0, to: 1 };

  // DOM order, so item 0 — leftmost on the first line — leaves first and the
  // last item of the last line leaves as the window closes.
  const rank = index / (total - 1);
  const from = rank * CASCADE;
  return { from, to: from + (1 - CASCADE) };
}

interface SweepOptions {
  distance: number;
  arc: number;
  rotate: number;
  index?: number;
  total?: number;
}

/** The animated style for one item, or `undefined` when it should stay put. */
function useSweep(progress: MotionValue<number>, options: SweepOptions) {
  const { distance, arc, rotate, index = 0, total = 1 } = options;
  const { from, to } = subWindow(index, total);
  const span = to - from;
  const stops = CURVE.map((point) => from + point * span);

  const opacity = useTransform(progress, stops, [1, 0.9, 0.45, 0]);
  const x = useTransform(progress, stops, [0, -distance * 0.22, -distance * 0.6, -distance]);
  const y = useTransform(progress, stops, [0, -arc * 0.8, -arc, -arc * 0.55]);
  const rotateZ = useTransform(progress, stops, [0, rotate * 0.25, rotate * 0.65, rotate]);

  // Static until hydration has measured a real scroll position, and dropped
  // entirely for reduced motion — the item just stays put either way.
  const reducedMotion = useMotionPreference();
  const hydrated = useHydrated();
  if (!hydrated || reducedMotion) return undefined;

  return { opacity, x, y, rotate: rotateZ };
}

const ProgressContext = createContext<MotionValue<number> | null>(null);

/**
 * Measures one scroll window for a whole group of items. The caller owns the
 * ref so the measured box can be the group's real container.
 */
export function useParabolicProgress(
  target: RefObject<HTMLElement | null>,
  size: SweepSize = "sm",
): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target, offset: WINDOW[size] });
  return scrollYProgress;
}

/**
 * Shares one progress value with every `<ParabolicItem>` below it. Renders no
 * DOM of its own, so it can sit between elements with a layout relationship —
 * a flex container and its children, say.
 */
export function ParabolicGroup({
  progress,
  children,
}: {
  progress: MotionValue<number>;
  children: ReactNode;
}) {
  return <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>;
}

interface ParabolicItemProps extends Partial<SweepOptions> {
  children: ReactNode;
  className?: string;
  /** Which scroll window to sweep across. `"lg"` for anything card-sized. */
  size?: SweepSize;
  /** Render as a `<span>` — required inside a paragraph or heading. */
  inline?: boolean;
}

/** Sweeps against a progress value measured somewhere above it. */
function GroupedItem({
  progress,
  children,
  className,
  inline,
  distance = 110,
  arc = 80,
  rotate = 12,
  index,
  total,
}: ParabolicItemProps & { progress: MotionValue<number> }) {
  const style = useSweep(progress, { distance, arc, rotate, index, total });

  return inline ? (
    <motion.span className={className} style={style}>
      {children}
    </motion.span>
  ) : (
    <motion.div className={className} style={style}>
      {children}
    </motion.div>
  );
}

/** Sweeps against its own box — the fallback when there is no group above. */
function SoloItem({
  children,
  className,
  inline,
  size = "sm",
  distance = 110,
  arc = 80,
  rotate = 12,
  index,
  total,
}: ParabolicItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useParabolicProgress(ref, size);
  const style = useSweep(progress, { distance, arc, rotate, index, total });

  return inline ? (
    <motion.span ref={ref} className={className} style={style}>
      {children}
    </motion.span>
  ) : (
    <motion.div ref={ref} className={className} style={style}>
      {children}
    </motion.div>
  );
}

export function ParabolicItem(props: ParabolicItemProps) {
  const shared = useContext(ProgressContext);

  // Two component types rather than a conditional hook: each branch runs a
  // fixed set of hooks, and swapping types remounts rather than reordering.
  return shared ? <GroupedItem progress={shared} {...props} /> : <SoloItem {...props} />;
}

type TextUnit = "letter" | "word";

/** Bigger text carries a bigger arc; body copy travels further but tumbles less. */
const UNIT_CONFIG: Record<TextUnit, { distance: number; arc: number; rotate: number }> = {
  letter: { distance: 120, arc: 95, rotate: 22 },
  word: { distance: 165, arc: 110, rotate: 12 },
};

interface ParabolicTextProps {
  text: string;
  /** `"letter"` for big headline text, `"word"` for body copy. */
  unit?: TextUnit;
  className?: string;
}

export function ParabolicText({ text, unit = "letter", className }: ParabolicTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const progress = useParabolicProgress(ref, "sm");
  const config = UNIT_CONFIG[unit];

  const words = text.split(" ");
  // Cascade index runs across the whole string, not per word, so a heading
  // sweeps as one continuous right-to-left wave rather than word by word;
  // `starts` is where each word's run of indices begins.
  const total = unit === "word" ? words.length : text.replace(/ /g, "").length;
  const starts = words.map((_, index) =>
    unit === "word"
      ? index
      : words.slice(0, index).reduce((sum, previous) => sum + previous.length, 0),
  );

  // Full string stays in the accessibility tree as one label; the per-word
  // and per-letter spans below are decorative and hidden from it — same
  // split-but-still-one-label approach as `<AnimatedText>`. Everything is a
  // span: this renders inside `<p>` and `<h2>`, where a div would end the
  // paragraph early and break hydration.
  return (
    <span ref={ref} className={className} aria-label={text}>
      <ParabolicGroup progress={progress}>
        {words.map((word, wordIndex) => {
          const wordCursor = starts[wordIndex] ?? 0;

          return (
            <span
              key={`${word}-${wordIndex}`}
              aria-hidden="true"
              className="inline-block whitespace-nowrap"
            >
              {unit === "word" ? (
                <ParabolicItem inline className="inline-block" index={wordCursor} total={total} {...config}>
                  {word}
                </ParabolicItem>
              ) : (
                word.split("").map((letter, letterIndex) => (
                  <ParabolicItem
                    key={`${letter}-${letterIndex}`}
                    inline
                    className="inline-block"
                    index={wordCursor + letterIndex}
                    total={total}
                    {...config}
                  >
                    {letter}
                  </ParabolicItem>
                ))
              )}
              {wordIndex < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
            </span>
          );
        })}
      </ParabolicGroup>
    </span>
  );
}
