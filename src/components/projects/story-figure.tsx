"use client";

import type { HTMLMotionProps, Variants } from "motion/react";
import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";

import { motionElement } from "@/components/motion/motion-element";
import { DURATION, EASE_OUT, VIEWPORT } from "@/components/motion/variants";
import {
  DEFAULT_IDENTITY,
  identityMotion,
  type ProjectIdentity,
} from "@/lib/constants/project-identity";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { STORY_DURATION, STORY_LATERAL, storySettle } from "./story-motion";

/**
 * Image entrance for the case study.
 *
 * `<Reveal>` fades and translates; this adds the one thing a photograph wants
 * that a paragraph does not — a barely-there settle from 0.98 to 1, so the
 * frame reads as arriving rather than as appearing. It is deliberately smaller
 * than a "zoom": at 2% the reader registers the movement without being able to
 * name it, and nothing around the image reflows because the scale is a
 * transform on a box whose aspect ratio is already fixed.
 *
 * It is scoped to this folder on purpose. The site has one reveal vocabulary
 * (`variants.ts`) and this borrows its curve and its viewport config rather
 * than inventing a second one; what it does not do is become a general
 * primitive, because outside a case study the plain `<Reveal>` is right.
 *
 * `tilt` adds the one thing a *screenshot* wants on top of that: a couple of
 * degrees of rotation on X, under a long 1200px perspective and hinged on the
 * frame's bottom edge, so it settles onto the page like an artifact being laid
 * down rather than a tile appearing in a grid. Three degrees is the ceiling on
 * purpose — past that the image is being displayed at an angle, and a
 * screenshot the reader cannot read straight has stopped being evidence.
 *
 * `signature` is the same gesture given room: further travel, a deeper settle,
 * a recession in Z and the long curve. It belongs to the one frame in a gallery
 * that is actually being presented — the lead shot — and to nothing else, for
 * the same reason only two chapters are signature chapters.
 *
 * It is a variant *parent*: `hidden`/`visible` propagate to any motion child
 * that declares `variants` and no `animate` of its own. That is how an evidence
 * frame assembles in layers — plane, edge, image, shadow — off one viewport
 * trigger instead of four (see `storyEvidenceVariants`). Children carry their
 * own delays, because Motion propagates variant *names*, not the parent's
 * `transition`.
 *
 * Under reduced motion the transform is dropped entirely and the image simply
 * appears — the same policy every other motion component here follows.
 */

interface StoryFigureProps
  extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "style"> {
  children: ReactNode;
  /** Seconds to wait once the frame is in view. Ignored under reduced motion. */
  delay?: number;
  /** Settle out of the page instead of straight up. For screenshots. */
  tilt?: boolean;
  /** The long beat. For the one frame a chapter is actually presenting. */
  signature?: boolean;
  /**
   * The project's character. It bends how the frame arrives — how much of the
   * travel is vertical, whether it comes from a side, and whether it grows into
   * its place or contracts onto it. The tilt, the perspective and the picture
   * itself are untouched: an artifact is still shown square and at full fidelity.
   */
  identity?: ProjectIdentity;
  as?: ElementType;
  style?: CSSProperties;
}

function figureVariants(
  reducedMotion: boolean,
  tilt: boolean,
  signature: boolean,
  identity: ProjectIdentity,
): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } },
    };
  }

  // The perspective is carried on both states rather than in a `style`, so the
  // rotation has somewhere to happen without a wrapper element around every
  // frame.
  //
  // `z` is only spent on the signature frame, and only when it is already
  // tilted: under the same 1200px perspective it starts 36px *behind* the page
  // and comes forward, which is the recession the lead evidence opens on. It is
  // a transform like the others — nothing reflows, and on a frame that is not
  // being presented it would be depth for its own sake.
  const depth = tilt
    ? {
        transformPerspective: 1200,
        rotateX: signature ? 3 : 2.2,
        ...(signature ? { z: -36 } : {}),
      }
    : {};

  const { rise, drift, contract, tempo } = identityMotion(identity);

  return {
    hidden: {
      opacity: 0,
      y: (signature ? 24 : 16) * rise,
      x: STORY_LATERAL.figure * drift,
      scale: storySettle(signature ? 0.965 : 0.98, contract),
      ...depth,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      ...(tilt ? { transformPerspective: 1200, rotateX: 0, ...(signature ? { z: 0 } : {}) } : {}),
      transition: {
        // Only the presented frame listens to the identity's tempo, for the same
        // reason only two chapters are signature chapters: a gallery where every
        // tile ran long would be a slow gallery, not a considered one.
        duration: signature ? STORY_DURATION.signature * tempo : STORY_DURATION.story,
        ease: EASE_OUT,
      },
    },
  };
}

export function StoryFigure({
  children,
  delay = 0,
  tilt = false,
  signature = false,
  identity = DEFAULT_IDENTITY,
  as = "div",
  style,
  ...props
}: StoryFigureProps) {
  const reducedMotion = useMotionPreference();

  // Hinged on the bottom edge, so a tilted frame pivots down onto the page
  // instead of rocking around its own middle. Skipped entirely without `tilt`:
  // there is nothing rotating for the origin to apply to.
  const origin: CSSProperties | undefined =
    tilt && !reducedMotion ? { transformOrigin: "center bottom", ...style } : style;

  // See the note in `fade-in.tsx` on why this is `createElement` and not JSX.
  return createElement(
    motionElement(as),
    {
      initial: "hidden",
      whileInView: "visible",
      viewport: VIEWPORT,
      variants: figureVariants(reducedMotion, tilt, signature, identity),
      transition: { delay: reducedMotion ? 0 : delay },
      ...(origin ? { style: origin } : {}),
      ...props,
    },
    children,
  );
}
