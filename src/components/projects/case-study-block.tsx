import type { ReactNode } from "react";

import { Stagger, StaggerItem } from "@/components/motion/stagger";
import {
  DEFAULT_IDENTITY,
  identityMotion,
  type ProjectIdentity,
} from "@/lib/constants/project-identity";
import { cn } from "@/lib/utils/cn";

import { StoryChapterHead } from "./story-heading";
import { StoryPlane, StoryThread } from "./story-layers";
import { StoryProse } from "./story-prose";
import { STAGE_CONFIG, isSignatureChapter, stageForChapter } from "./story-stage";

/**
 * One chapter of a case study.
 *
 * Renders nothing when its field is empty, which is what lets the page describe
 * a small project in two chapters and a large one in six without either looking
 * unfinished. The index label is passed in rather than derived so the numbering
 * stays continuous when a chapter is skipped.
 *
 * The chapter is a sequence, not a two-column layout, and it is staged rather
 * than stacked. In order: the thread arrives from the chapter above, the plane
 * it sits on fades up behind it, a hairline rule is drawn left to right, the
 * number slides in along it, the serif heading rises, then the prose, block by
 * block. The reader's eye already travels that way — the motion only agrees with
 * it, and the widening gap between those beats is what turns a list of parts
 * into a hierarchy.
 *
 * Which chapter it is decides how it behaves. `stageForChapter` maps the id to
 * one of four acts, and the act sets the backdrop tone, the pace, the wait
 * before that pace starts, the spacing, how the depth plane is composed, how
 * strongly the thread reads, and how wide the column is: `tension` (the problem,
 * and again at the challenges) waits longer, arrives slower, stands further from
 * its neighbours and is read in a narrower, deeper-indented column, because a
 * pause is something you build out of room and timing, not out of an effect.
 * The tone is published as `data-tone`/`data-tone-anchor` on the section itself,
 * so the single IntersectionObserver already running for the site backdrop
 * drives the environment change — no second observer, no scroll handler, no rAF
 * loop.
 *
 * A chapter that opens a *different act* than the one above it also crosses a
 * threshold: the connector from the previous chapter ends in an open node where
 * it meets this one, and the chapter's opening rule ignites in the new act's
 * tone before settling into the ordinary hairline. Nothing is labelled and no
 * navigation appears — the reader is simply told, in the page's own grammar,
 * that this is a different part of the story. Which chapters those are is
 * derived from the act map, so a project missing a chapter still gets its
 * thresholds in the right places.
 *
 * Two chapters — the turn into the approach, and the results — are marked
 * signature, and only there does anything take the long curve or the scroll-
 * linked plane. See `isSignatureChapter`: the moments work because they are
 * rare.
 *
 * The body is capped in `ch`, not `rem`: the measure that matters is how many
 * characters land on a line, and at this font size a 42rem column ran past 80.
 * Non-prose chapters (the gallery) opt out — a grid of screenshots has no line
 * length to protect and should use the column it is given.
 */

/**
 * Chapters are tall. The shared `VIEWPORT` waits for a quarter of the element,
 * which on a 900px chapter means the heading sits visible-but-transparent for
 * most of a screen height before it agrees to appear — the reader watches a
 * blank page scroll past. `amount: "some"` fires at the top edge instead, and
 * the -80px margin still holds it back until the heading has properly arrived.
 */
const CHAPTER_VIEWPORT = { once: true, amount: "some", margin: "0px 0px -80px 0px" } as const;

interface CaseStudyBlockProps {
  index: string;
  /** Total chapter count, pre-formatted. Printed beside the number. */
  total?: string;
  title: string;
  /** Plain-text body from the CMS. */
  content?: string;
  /** Rendered instead of `content` for chapters that are not prose. */
  children?: ReactNode;
  /**
   * Gives the chapter the weight of a conclusion: accent rule, larger heading,
   * larger body. Reserved for outcomes — it changes emphasis, never content.
   */
  emphasis?: boolean;
  /** Used for the heading id, so the section is labelled by its own heading. */
  id: string;
  /**
   * False for the first chapter on the page, which has nothing above it to be
   * threaded to.
   */
  connected?: boolean;
  /** The last chapter: its thread ends in a node rather than running out. */
  last?: boolean;
  /**
   * This chapter opens a different act than the one above it. Derived on the
   * page from the chapter list — see `isActThreshold` — never authored.
   */
  threshold?: boolean;
  /**
   * The project's visual character. It reaches three places from here and no
   * others: the section's `data-identity`, which is what the backdrop's existing
   * observer and the `globals.css` motif rules read; the stagger's step, so a
   * modular project's parts follow each other more crisply than a temporal one's;
   * and the three children, which bend their own variants by it.
   */
  identity?: ProjectIdentity;
}

export function CaseStudyBlock({
  index,
  total,
  title,
  content,
  children,
  emphasis = false,
  id,
  connected = true,
  last = false,
  threshold = false,
  identity = DEFAULT_IDENTITY,
}: CaseStudyBlockProps) {
  const isProse = !children && Boolean(content?.trim());
  if (!children && !isProse) return null;

  const headingId = `chapter-${id}`;
  const stage = STAGE_CONFIG[stageForChapter(id)];
  const signature = isSignatureChapter(id);
  // The act still decides the pace; the identity only leans on it. Rounded to
  // the millisecond so a multiplier cannot leak float noise into a transition.
  const step = Math.round(stage.step * identityMotion(identity).cadence * 1000) / 1000;

  return (
    <Stagger
      as="section"
      aria-labelledby={headingId}
      step={step}
      delayChildren={stage.lead}
      viewport={CHAPTER_VIEWPORT}
      data-tone={stage.tone}
      data-tone-anchor=""
      data-identity={identity}
      className={cn("relative isolate", stage.spacing)}
    >
      {connected ? (
        <StoryThread
          className={stage.thread}
          signature={signature}
          terminal={last}
          turn={threshold}
        />
      ) : null}
      <StoryPlane className={stage.plane} signature={signature} identity={identity} />

      <StoryChapterHead
        index={index}
        total={total}
        title={title}
        headingId={headingId}
        emphasis={emphasis}
        signature={signature}
        turn={threshold}
        identity={identity}
      />

      {/*
        Prose is handed to `<StoryProse>`, which is both this stagger's next
        child and a stagger of its own — so the paragraphs queue behind the
        heading rather than landing with it. A non-prose chapter keeps the plain
        item: a gallery already sequences itself, frame by frame.
      */}
      {isProse && content ? (
        <StoryProse
          content={content}
          emphasis={emphasis}
          identity={identity}
          className={cn("mt-6 sm:mt-8", stage.body)}
        />
      ) : (
        <StaggerItem className="mt-6 max-w-3xl text-base sm:mt-8 sm:pl-[5.5rem]">
          {children}
        </StaggerItem>
      )}
    </Stagger>
  );
}
