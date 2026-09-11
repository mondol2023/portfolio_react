import type { Variants } from "motion/react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import {
  DEFAULT_IDENTITY,
  identityMotion,
  type ProjectIdentity,
} from "@/lib/constants/project-identity";

/**
 * The case study's own variants, and the three speeds it runs them at.
 *
 * Everything here borrows `EASE_OUT` and `DURATION` from the shared vocabulary
 * — this is not a second animation system, it is a handful of shapes the
 * site-wide `Reveal` does not have and that only a long-form story needs:
 *
 *   rule    the hairline that opens a chapter, drawn left to right. A chapter
 *           begins with a line being ruled, not with a line appearing.
 *   index   the chapter number. The smallest beat on the page and the first —
 *           it is a label arriving, so it moves like one.
 *   heading the serif title, rising into the space the rule just opened.
 *   block   a paragraph, list or quotation settling into place. Shorter travel
 *           than a `Reveal` (12px, not 24) and a hair of scale, because these
 *           fire several to a chapter and a full reveal on each would read as
 *           the page assembling itself in front of the reader.
 *   plane   the decorative middle ground fading up behind the text.
 *   thread  the connector between chapters drawing downward from the previous
 *           one, which is the gesture that says "still the same story".
 *
 * All of them collapse to a plain fade — or to nothing — under reduced motion.
 */

/**
 * Three speeds, and only three.
 *
 * `micro` and `story` are the shared vocabulary's `fast` and `slow` under names
 * that say what they are used for here; `signature` exists nowhere else on the
 * site and is spent on the two moments the page has decided are worth it (see
 * `SIGNATURE_CHAPTERS` in `story-stage.ts`). Keeping the long duration rare is
 * the whole reason it reads as deliberate rather than as a slow page.
 */
export const STORY_DURATION = {
  /** A label, a hover, a line. 250ms. */
  micro: DURATION.fast,
  /** A chapter arriving, an image landing. 750ms. */
  story: DURATION.slow,
  /** The two cinematic beats, and nothing else. */
  signature: 1.15,
} as const;

/**
 * The project's motion character, and the three ways it is spent.
 *
 * Every variant below already knew how far its element travels and how it
 * settles. The identity does not replace those numbers — it *bends* them: how
 * much of the travel stays vertical (`rise`), how much of it becomes lateral
 * (`drift`), and which side of 1 the scale starts on (`contract`). One project
 * therefore reads as converging inward, another as stepping into register, and
 * another as travelling across, without any of them leaving this file's
 * vocabulary or its two durations.
 *
 * `base` is all ones and zeroes, so a project with no identity gets exactly the
 * variants this module shipped with.
 */

/** How far a heading or a figure is allowed to move sideways, in px. */
export const STORY_LATERAL = { head: 16, headSignature: 22, block: 9, figure: 14 } as const;

/** The variant's own scale, bent toward or away from 1 by the identity. */
export function storySettle(base: number, contract: number): number {
  return 1 + (base - 1) * contract;
}

/** Picks the story/signature pair without a ternary at every call site. */
function beat(signature: boolean, tempo = 1): number {
  return signature ? STORY_DURATION.signature * tempo : STORY_DURATION.story;
}

/**
 * Where a chapter's opening rule is drawn from.
 *
 * The rule is the first mark of every chapter, so it is the cheapest place on
 * the page to say which project this is: the identities whose motif converges
 * on a centre open theirs outward from the middle, and the ones that travel or
 * align rule theirs left to right like the page always has. It is a
 * `transform-origin` class and nothing else — the animation is unchanged.
 */
export function storyRuleOrigin(identity: ProjectIdentity = DEFAULT_IDENTITY): string {
  return identity === "atlas" || identity === "signal" ? "origin-center" : "origin-left";
}

/** The chapter's opening rule, ruled rather than revealed. */
export function storyRuleVariants(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: STORY_DURATION.micro, ease: EASE_OUT } },
    };
  }

  return {
    hidden: { opacity: 0, scaleX: 0 },
    visible: {
      opacity: 1,
      scaleX: 1,
      transition: { duration: STORY_DURATION.story, ease: EASE_OUT },
    },
  };
}

/** The chapter number. A short slide along the rule it sits on. */
export function storyIndexVariants(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: STORY_DURATION.micro, ease: EASE_OUT } },
    };
  }

  return {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: STORY_DURATION.micro, ease: EASE_OUT },
    },
  };
}

/**
 * The chapter heading.
 *
 * Travels further than anything else in the chapter and lands slower, because
 * this is the line that establishes the scene — the prose behind it is allowed
 * to feel like it is following something.
 *
 * No scale: a serif headline scaled through a transform is a headline rendered
 * at the wrong size for the length of the animation, and at this type size the
 * reader can see it.
 */
export function storyHeadingVariants(
  reducedMotion: boolean,
  identity: ProjectIdentity = DEFAULT_IDENTITY,
  signature = false,
): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: STORY_DURATION.micro, ease: EASE_OUT } },
    };
  }

  const { rise, drift, tempo } = identityMotion(identity);
  const lateral = signature ? STORY_LATERAL.headSignature : STORY_LATERAL.head;

  return {
    hidden: { opacity: 0, y: (signature ? 26 : 18) * rise, x: lateral * drift },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { duration: beat(signature, tempo), ease: EASE_OUT },
    },
  };
}

/** One semantic group of prose. */
export function storyBlockVariants(
  reducedMotion: boolean,
  identity: ProjectIdentity = DEFAULT_IDENTITY,
): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } },
    };
  }

  const { rise, drift, contract } = identityMotion(identity);

  return {
    // A paragraph gets a third of the heading's lateral distance. The identity
    // should be legible in how a chapter *opens*; a body column that slid as far
    // as its title would be a reading experience, not a motif.
    hidden: {
      opacity: 0,
      y: 12 * rise,
      x: STORY_LATERAL.block * drift * 0.34,
      scale: storySettle(0.985, contract),
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: { duration: DURATION.base, ease: EASE_OUT },
    },
  };
}

/**
 * The depth plane. Decorative, so under reduced motion it is simply present
 * from the start rather than fading — there is nothing here to reveal.
 *
 * On a signature chapter it takes the long beat: the environment is what
 * changes at those two moments, so it should still be settling after the
 * heading has landed.
 */
export function storyPlaneVariants(
  reducedMotion: boolean,
  identity: ProjectIdentity = DEFAULT_IDENTITY,
  signature = false,
): Variants {
  if (reducedMotion) return { hidden: { opacity: 1 }, visible: { opacity: 1 } };

  const { contract, tempo } = identityMotion(identity);

  return {
    // The one place the contract reads as *space* rather than as an object: a
    // plane that starts oversized is a room closing in on the column, and one
    // that starts undersized is a room opening out from it.
    hidden: { opacity: 0, scale: storySettle(0.98, contract) },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: beat(signature, tempo), ease: EASE_OUT },
    },
  };
}

/**
 * The connector. Scales from its top edge, so it reads as being drawn down from
 * the chapter above rather than growing out of nowhere.
 *
 * The duration is the act's, not a constant: the thread into a signature
 * chapter is still being drawn while the heading arrives, which is what makes
 * the two chapters read as one continuous move rather than two entrances.
 */
export function storyThreadVariants(reducedMotion: boolean, signature = false): Variants {
  if (reducedMotion) return { hidden: { opacity: 1 }, visible: { opacity: 1 } };

  return {
    hidden: { opacity: 0, scaleY: 0 },
    visible: {
      opacity: 1,
      scaleY: 1,
      transition: { duration: beat(signature), ease: EASE_OUT },
    },
  };
}

/**
 * The evidence layers, and the order an artifact assembles itself in.
 *
 * A screenshot in this gallery is not one element that fades — it is a stack:
 * the plane it lies on, the hairline edge around it, the picture itself, and
 * the shadow it casts. Animating the stack as a single opacity is what makes a
 * gallery read as a page loading. Animating it in that order — ground, then
 * frame, then image, then weight — is what makes it read as something being
 * *placed*, which is the whole difference between an image grid and evidence.
 *
 * The offsets below are the entire sequencing budget. The image is deliberately
 * third and deliberately early in absolute terms: at 120ms (or 220ms for the
 * lead) the picture is already resolving, so the reader never waits on the
 * choreography to see what was built. Only the shadow lands late, and nobody
 * waits on a shadow.
 *
 * The lead frame gets the longer version of the same sequence, for the same
 * reason it gets the width — it is the one being presented.
 */
const EVIDENCE_SEQUENCE = {
  standard: { plate: 0, edge: 0.05, image: 0.12, elevation: 0.24 },
  lead: { plate: 0, edge: 0.1, image: 0.22, elevation: 0.4 },
} as const;

export type EvidenceLayer = keyof (typeof EVIDENCE_SEQUENCE)["lead"];

interface EvidenceOptions {
  /** The presented frame. Longer sequence, deeper settle. */
  lead?: boolean;
  /** The project's character. Only the lead frame's beat listens to it. */
  identity?: ProjectIdentity;
  /**
   * The parent frame's own delay, added to every step.
   *
   * Motion does not propagate a parent's `transition.delay` to children, so a
   * frame that waits for its row would otherwise start assembling itself before
   * it had arrived. Passing the delay down keeps the stack welded to its frame.
   */
  delay?: number;
}

/**
 * One layer of an evidence frame.
 *
 * The plane and the shadow are decoration, so under reduced motion they are
 * simply present from the start; the edge and the image fade, fast and without
 * the sequencing — there is no choreography to read when nothing moves.
 */
export function storyEvidenceVariants(
  reducedMotion: boolean,
  layer: EvidenceLayer,
  { lead = false, delay = 0, identity = DEFAULT_IDENTITY }: EvidenceOptions = {},
): Variants {
  if (reducedMotion) {
    if (layer === "plate" || layer === "elevation") {
      return { hidden: { opacity: 1 }, visible: { opacity: 1 } };
    }

    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: STORY_DURATION.micro, ease: EASE_OUT } },
    };
  }

  const transition = {
    // The picture resolves on the structural beat, not the atmospheric one: it
    // is the content, and content should not take three quarters of a second.
    duration: layer === "image" ? DURATION.base : beat(lead, identityMotion(identity).tempo),
    ease: EASE_OUT,
    delay: delay + (lead ? EVIDENCE_SEQUENCE.lead : EVIDENCE_SEQUENCE.standard)[layer],
  };

  // A hair of overscan on the image only. The frame around it holds still, so
  // the picture settles *into* its edges rather than the whole tile breathing.
  if (layer === "image") {
    return {
      hidden: { opacity: 0, scale: 1.035 },
      visible: { opacity: 1, scale: 1, transition },
    };
  }

  return { hidden: { opacity: 0 }, visible: { opacity: 1, transition } };
}
