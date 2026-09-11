"use client";

import { motion } from "motion/react";

import { DEFAULT_IDENTITY, type ProjectIdentity } from "@/lib/constants/project-identity";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import {
  storyHeadingVariants,
  storyIndexVariants,
  storyRuleOrigin,
  storyRuleVariants,
} from "./story-motion";

/**
 * A chapter's opening: rule, number, title.
 *
 * These used to arrive as two beats — a rule, then a header carrying the number
 * and the title together. They are three, because they are three different
 * *kinds* of thing and a reader reads them in that order anyway:
 *
 *   the rule    ruled left to right in three quarters of a second. A chapter
 *               starts with a line being drawn, not with a line appearing.
 *   the number  a label. It slides eight pixels along the rule it sits on and
 *               is done in a quarter second — it is the smallest thing here and
 *               it should be the quickest.
 *   the title   the line that establishes the scene. Furthest travel, slowest
 *               landing, and slower still on the two signature chapters.
 *
 * The point is the hierarchy, not the count: by the time the prose below starts
 * arriving the reader has already been told, by nothing but timing, which of
 * these three they were supposed to look at.
 *
 * It is one client component rather than three because the three share exactly
 * one input — the reduced-motion preference — and splitting them would mean
 * three subscriptions to the same media query for one chapter heading.
 *
 * Like `<StoryProse>`, it declares `variants` and no trigger: the parts inherit
 * the chapter's hidden/visible state through Motion's context and take their
 * slots in the chapter's own stagger, so there is no delay arithmetic here.
 *
 * **The number carries the position.** `01 ⁄ 07` is the page's entire answer to
 * "where am I in this project", and it is deliberately typography rather than a
 * progress element: it needs no scroll position, no state, no client work, it
 * is legible at a glance and to a screen reader, and it survives reduced motion
 * without changing at all. A percentage read-out or a rail down the margin
 * would answer the same question by turning a case study into a dashboard.
 *
 * **The head recedes as it leaves.** The wrapper carries `.story-head`, whose
 * settle is a CSS scroll-driven animation — see `globals.css`. Nothing about it
 * is JavaScript: a heading on its way out of the top of the viewport gives up
 * its contrast to the chapter replacing it, and scrolling back restores it.
 */

interface StoryChapterHeadProps {
  /** Pre-formatted ("01"). Passed in so numbering survives a skipped chapter. */
  index: string;
  /** Pre-formatted chapter count ("07"), printed after the number. */
  total?: string;
  title: string;
  /** The chapter's `aria-labelledby` target. */
  headingId: string;
  /** Conclusion weight: accent rule, larger title. Never changes the content. */
  emphasis?: boolean;
  /** One of the story's two cinematic beats — the title takes the long curve. */
  signature?: boolean;
  /** This chapter opens a new act: the rule ignites in the act's tone. */
  turn?: boolean;
  /**
   * The project's visual character. It decides which edge the rule is drawn
   * from and how the title arrives — see `story-motion.ts`. The words are
   * untouched by it.
   */
  identity?: ProjectIdentity;
}

export function StoryChapterHead({
  index,
  total,
  title,
  headingId,
  emphasis = false,
  signature = false,
  turn = false,
  identity = DEFAULT_IDENTITY,
}: StoryChapterHeadProps) {
  const reducedMotion = useMotionPreference();

  return (
    <div className="story-head">
      {/* The wrapper is what scales; the hairline inside keeps its own colour
          and its 1px height, which a scaled border would not. */}
      <motion.div
        aria-hidden="true"
        variants={storyRuleVariants(reducedMotion)}
        className={storyRuleOrigin(identity)}
      >
        <span
          className={cn(
            "block h-px w-full",
            turn ? "story-rule--turn" : emphasis ? "bg-accent/50" : "bg-border",
          )}
        />
      </motion.div>

      <header
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6",
          emphasis ? "mt-8 sm:mt-10" : "mt-7",
        )}
      >
        <motion.p
          variants={storyIndexVariants(reducedMotion)}
          className="label-mono shrink-0 sm:w-16"
        >
          {index}
          {total ? (
            <>
              {/*
                The count is printed for the eye and spoken for the ear, in the
                two forms each reads best: a thin fraction slash on screen, the
                word "of" in the accessibility tree. Neither is a second source
                of truth — both are the same two numbers the page already has.
              */}
              <span aria-hidden="true" className="text-fg-subtle">
                {" ⁄ "}
                {total}
              </span>
              <span className="sr-only"> of {total}</span>
            </>
          ) : null}
        </motion.p>

        <motion.h2
          id={headingId}
          variants={storyHeadingVariants(reducedMotion, identity, signature)}
          className={cn(
            "font-serif tracking-tight text-balance text-fg",
            emphasis ? "text-[2rem] leading-[1.1] sm:text-5xl" : "text-2xl sm:text-3xl",
          )}
        >
          {title}
        </motion.h2>
      </header>
    </div>
  );
}
