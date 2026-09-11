"use client";

import { motion } from "motion/react";
import { useRef } from "react";

import {
  DEFAULT_IDENTITY,
  identityMotion,
  type ProjectIdentity,
} from "@/lib/constants/project-identity";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { useStoryDrift } from "./story-camera";
import { storyPlaneVariants, storyThreadVariants } from "./story-motion";

/**
 * The two decorative layers behind a chapter.
 *
 * Both are `aria-hidden`, both sit at negative z-index inside the chapter's own
 * stacking context, and neither carries information. Delete them and the case
 * study loses depth and gains nothing else — which is the test §12 asks for: the
 * story has to be complete in the foreground on its own.
 *
 * They declare `variants` but no trigger, so they inherit the chapter's
 * hidden/visible state through Motion's context and arrive as part of its
 * sequence rather than firing on their own schedule.
 */

/**
 * How far a signature chapter's plane drifts against the scroll, as a
 * percentage of its own height, is the identity's `signatureTravel`.
 *
 * It stays tiny whatever the identity asks for, and it has to: the plane
 * already bleeds 2rem past the chapter's box (`-inset-y-8`), so at a couple of
 * percent of a chapter's height the drift stays inside the bleed at any
 * realistic chapter length and the edge never becomes a visible rectangle
 * sliding around behind the text. That bleed is the ceiling on the number — an
 * identity may make the camera move more, never enough to expose the plane.
 */
const PLANE_CLASS = "story-plane pointer-events-none absolute inset-x-0 -inset-y-8 -z-10 rounded-card";

interface PlaneProps {
  className?: string;
  /** The project's character: how the plane settles, and how far it drifts. */
  identity?: ProjectIdentity;
}

/**
 * Middle ground: a soft, tone-tinted plane the text sits on.
 *
 * Bleeds vertically past the chapter's box so the edge is never a visible
 * rectangle, but never horizontally — a plane wider than its column would be a
 * scrollbar on a phone. How it is *composed* is the act's decision: see the
 * `.story-plane--*` rules in `globals.css`, where `tension` gets two offset
 * light sources and a harder edge and `clarity` gets one centred wash.
 */
function FlatPlane({ className, identity = DEFAULT_IDENTITY }: PlaneProps) {
  const reducedMotion = useMotionPreference();

  return (
    <motion.div
      aria-hidden="true"
      variants={storyPlaneVariants(reducedMotion, identity)}
      style={{ transformOrigin: "top center" }}
      className={cn(PLANE_CLASS, className)}
    />
  );
}

/**
 * The same plane, given the page's one borrowed camera move.
 *
 * Split into its own component rather than a flag on the shared one because
 * `useStoryDrift` opens a scroll subscription and a resize observation per
 * instance: as a prop it would run for all seven chapters and only be *used* by
 * two. Rendering one component or the other keeps its hooks unconditional and
 * the cost proportional to the two moments that asked for it.
 */
function DriftingPlane({ className, identity = DEFAULT_IDENTITY }: PlaneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useMotionPreference();
  const y = useStoryDrift(ref, identityMotion(identity).signatureTravel);

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      variants={storyPlaneVariants(reducedMotion, identity, true)}
      style={y ? { y, transformOrigin: "top center" } : { transformOrigin: "top center" }}
      className={cn(PLANE_CLASS, className)}
    />
  );
}

export function StoryPlane({
  className,
  signature = false,
  identity = DEFAULT_IDENTITY,
}: PlaneProps & { signature?: boolean }) {
  return signature ? (
    <DriftingPlane className={className} identity={identity} />
  ) : (
    <FlatPlane className={className} identity={identity} />
  );
}

interface StoryThreadProps {
  /** The act's `.story-thread--*` class. Sets how strongly the line reads. */
  className?: string;
  /** Draws on the long beat, alongside a signature chapter's heading. */
  signature?: boolean;
  /** The last thread in the story: it ends in a node instead of running out. */
  terminal?: boolean;
  /**
   * This chapter opens a different act than the one above it. The thread ends
   * in an open node where it meets the new chapter — the threshold.
   */
  turn?: boolean;
}

/**
 * The thread from the chapter above, drawn down through the gap between them.
 *
 * Its height matches the gap the page puts between chapters, so it reaches the
 * previous chapter's baseline exactly and the seven sections read as one
 * continuous descent instead of a stack of cards.
 *
 * Where the line crosses from one act into the next it ends in an open node,
 * and where the story ends it ends in a filled one. Those two marks are the
 * page's whole threshold vocabulary: the reader is told, without a label and
 * without a navigation element, that this chapter begins a different part of
 * the story — or that there is no further part.
 *
 * It is not the same line all the way down. Each act tints and dims it
 * differently — faintest through the opening, most present through the two
 * structural acts where the story is actually building — and the last one ends
 * in a small node rather than fading out, so the line arrives somewhere instead
 * of simply stopping. That progression is the whole of its job: a reader should
 * feel the story has been continuous long before they notice there is a line.
 */
export function StoryThread({
  className,
  signature = false,
  terminal = false,
  turn = false,
}: StoryThreadProps) {
  const reducedMotion = useMotionPreference();

  return (
    <motion.span
      aria-hidden="true"
      variants={storyThreadVariants(reducedMotion, signature)}
      className={cn(
        "story-thread pointer-events-none absolute -top-20 left-0 -z-10 h-20 w-px origin-top sm:-top-28 sm:h-28",
        className,
        // A thread is one or the other, never both: the story ends where it
        // ends, and a chapter that is both the last one and an act change is
        // an ending first.
        terminal ? "story-thread--end" : turn && "story-thread--turn",
      )}
    />
  );
}
