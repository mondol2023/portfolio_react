"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Maximize2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  DEFAULT_IDENTITY,
  identityProfile,
  type EvidenceFlow,
  type ProjectIdentity,
} from "@/lib/constants/project-identity";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { EvidenceViewer, type EvidenceItem } from "./evidence-viewer";
import { storyEvidenceVariants, type EvidenceLayer } from "./story-motion";
import { StoryFigure } from "./story-figure";

/**
 * The screenshots, hung.
 *
 * Three things separate this from the contact sheet it replaces.
 *
 * **Hierarchy.** The frames are not equal. The first one is the lead — the shot
 * being *presented* — and it takes the full width; the next four are the
 * supporting evidence and take half; anything past that is the rest of the
 * record and takes a third. The order is the one the CMS stores and the roles
 * are read off it, because that order is the only statement of importance the
 * data actually makes. Nothing here promotes an image on its own judgement, and
 * nothing here writes a caption the project does not have.
 *
 * **Assembly.** Each frame is a stack rather than a tile: the plane it lies on,
 * the hairline edge, the picture, the shadow — arriving in that order off one
 * viewport trigger (see `storyEvidenceVariants`). The alternative, one opacity
 * over the whole tile, is what makes a gallery read as a page loading.
 *
 * **Inspection.** Every frame is a button. A screenshot at 45% of a column is
 * evidence you can see but not read, and the whole point of the chapter is that
 * the reader can check the claim — so the frame opens into `EvidenceViewer`
 * and closes back onto itself.
 *
 * Each frame is still its own viewport trigger rather than one `<Stagger>` over
 * the list. A gallery is taller than a screen, so a shared parent would either
 * fire everything while most of it is still below the fold, or hand the last
 * image a delay accumulated from siblings the reader scrolled past a second
 * ago. The delay is derived from the frame's column instead, which keeps the
 * row-arrives-together reading on desktop and costs nothing on mobile, where
 * every image is column zero and every delay is therefore the same.
 *
 * **Which order a row arrives in is the project's.** The identity picks one of
 * five flows over the same columns — see `EvidenceFlow`. Nothing new moves and
 * nothing moves further; a row simply starts at its centre, at its left edge,
 * outward from the lead, or all at once. The images themselves are untouched by
 * it: no filters, no tints, no crops, no captions this gallery did not receive.
 */

/** Frames that count as supporting evidence, after the lead. */
const SUPPORTING = 4;

/**
 * The gap between two frames in the same row. One value for every flow, so an
 * identity changes the *order* a row assembles in and never how long it takes.
 */
const FRAME_STEP = 0.08;

type Role = "lead" | "supporting" | "additional";

interface Layout {
  role: Role;
  /** Column span in the six-column desktop grid. */
  span: string;
  aspect: string;
  sizes: string;
  /** Which column of its band this frame sits in on desktop, and how many. */
  column: number;
  columns: number;
}

function layoutFor(index: number): Layout {
  if (index === 0) {
    return {
      role: "lead",
      span: "sm:col-span-6",
      aspect: "aspect-[16/9]",
      sizes: "(min-width: 1280px) 76rem, 100vw",
      // The lead owns its row, so it never waits on a neighbour.
      column: 0,
      columns: 1,
    };
  }

  if (index <= SUPPORTING) {
    return {
      role: "supporting",
      span: "sm:col-span-3",
      aspect: "aspect-[16/10]",
      sizes: "(min-width: 640px) 45vw, 100vw",
      column: (index - 1) % 2,
      columns: 2,
    };
  }

  return {
    role: "additional",
    span: "sm:col-span-2",
    aspect: "aspect-[16/10]",
    sizes: "(min-width: 640px) 30vw, 100vw",
    column: (index - SUPPORTING - 1) % 3,
    columns: 3,
  };
}

/**
 * How long this frame waits once it is in view.
 *
 * Every branch is bounded by a row's width times `FRAME_STEP` — a fifth of a
 * second at the very worst — because a reader looking at a screenshot is
 * checking a claim, and evidence that keeps them waiting is evidence that has
 * started performing.
 */
function frameDelay(flow: EvidenceFlow, index: number, layout: Layout): number {
  if (index === 0) return 0;

  const { column, columns } = layout;

  switch (flow) {
    // Everything in the row at once: a system's parts are delivered together.
    case "block":
      return 0;

    // Inward from the edges onto the middle of the row.
    case "orbit": {
      const centre = (columns - 1) / 2;
      return (centre - Math.abs(column - centre)) * FRAME_STEP;
    }

    // Straight across, left to right, at a slightly longer stride.
    case "sweep":
      return column * FRAME_STEP * 1.4;

    // Outward from the lead frame, which is the artifact everything else
    // supports. Capped at five frames so a long gallery does not accumulate.
    case "propagate":
      return Math.min(index, 5) * FRAME_STEP * 0.5;

    // The page's own behaviour: frames pair by column.
    case "pair":
    default:
      return column * FRAME_STEP;
  }
}

interface EvidenceExhibitionProps {
  items: EvidenceItem[];
  title: string;
  /** The chapter these belong to, carried into the viewer as context. */
  context?: string;
  /** The project's character. Decides the flow, and nothing about the images. */
  identity?: ProjectIdentity;
}

export function EvidenceExhibition({
  items,
  title,
  context,
  identity = DEFAULT_IDENTITY,
}: EvidenceExhibitionProps) {
  const reducedMotion = useMotionPreference();
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  // One measurement, on the click that opens the viewer. Nothing here reads
  // layout on scroll or on a frame.
  const pointAt = useCallback((index: number) => {
    const rect = triggers.current[index]?.getBoundingClientRect();
    if (!rect) return;
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, []);

  const inspect = useCallback(
    (index: number) => {
      pointAt(index);
      setActive(index);
      setOpen(true);
    },
    [pointAt],
  );

  // Stepping inside the viewer re-points the origin at the frame that will be
  // returned to, so closing lands on the artifact actually being looked at
  // rather than the one the reader opened several exhibits ago.
  const select = useCallback(
    (index: number) => {
      setActive(index);
      pointAt(index);
    },
    [pointAt],
  );

  // `focus()` scrolls the frame back into view on its own, which is the whole
  // "return to the same evidence position" behaviour — the reader steps back
  // out onto the exhibit they were inspecting, mid-chapter, on the same page.
  const restore = useCallback(() => {
    triggers.current[active]?.focus();
  }, [active]);

  const flow = identityProfile(identity).evidence;

  return (
    <>
      <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-6">
        {items.map((item, index) => {
          const layout = layoutFor(index);
          const { role, span, aspect, sizes } = layout;
          const lead = role === "lead";
          const delay = frameDelay(flow, index, layout);
          const layer = (name: EvidenceLayer) =>
            storyEvidenceVariants(reducedMotion, name, { lead, delay, identity });

          return (
            <StoryFigure
              as="li"
              key={item.src}
              tilt
              signature={lead}
              delay={delay}
              identity={identity}
              className={cn("min-w-0", span)}
            >
              <button
                type="button"
                ref={(node) => {
                  triggers.current[index] = node;
                }}
                onClick={() => inspect(index)}
                aria-label={`${title} — screenshot ${index + 1} of ${items.length}. View larger.`}
                className={cn(
                  "group block w-full rounded-card text-left",
                  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
                )}
              >
                <span
                  className={cn(
                    "relative block",
                    // The hover invitation, and the only transform on the frame
                    // once it has landed. Movement is skipped under reduced
                    // motion; the border and the shadow still answer.
                    "motion-safe:transition-transform motion-safe:duration-300",
                    "motion-safe:group-hover:-translate-y-1",
                    "motion-safe:group-focus-visible:-translate-y-1",
                  )}
                >
                  {/* The weight. Last to arrive, and the layer hover deepens. */}
                  <motion.span
                    aria-hidden="true"
                    variants={layer("elevation")}
                    className={cn(
                      "absolute inset-2 rounded-card transition-shadow duration-300",
                      lead ? "shadow-elevated" : "shadow-sm",
                      "group-hover:shadow-floating group-focus-visible:shadow-floating",
                    )}
                  />

                  {/* The plane the artifact is laid on. First to arrive. */}
                  <motion.span
                    aria-hidden="true"
                    variants={layer("plate")}
                    className="absolute inset-0 rounded-card bg-bg-subtle"
                  />

                  {/*
                    The edge. Carries no background of its own, so the plane
                    behind it is what the reader sees while the picture is
                    still resolving.
                  */}
                  <motion.span
                    variants={layer("edge")}
                    className={cn(
                      "story-frame relative block overflow-hidden rounded-card border border-border",
                      "transition-colors duration-300 group-hover:border-border-strong",
                      "group-focus-visible:border-border-strong",
                      aspect,
                      lead && "story-frame--lead",
                    )}
                  >
                    <motion.span variants={layer("image")} className="absolute inset-0 block">
                      <Image
                        src={item.src}
                        alt={item.alt}
                        fill
                        loading="lazy"
                        sizes={sizes}
                        className="object-cover"
                      />
                    </motion.span>
                  </motion.span>
                </span>

                {/*
                  The observation line under every artifact: which exhibit this
                  is, and that it can be opened. The affordance is printed
                  rather than hovered, because a touch reader never hovers and a
                  keyboard reader should not have to guess.
                */}
                <span className="mt-3 flex items-center justify-between gap-3">
                  <span className="label-mono">{item.number}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "label-mono inline-flex items-center gap-1.5 text-fg-subtle",
                      "transition-colors duration-300 group-hover:text-fg",
                      "group-focus-visible:text-fg",
                    )}
                  >
                    Inspect
                    <Maximize2 className="size-3" />
                  </span>
                </span>
              </button>
            </StoryFigure>
          );
        })}
      </ul>

      <EvidenceViewer
        items={items}
        active={active}
        open={open}
        origin={origin}
        title={title}
        context={context}
        onSelect={select}
        onClose={() => setOpen(false)}
        onClosed={restore}
      />
    </>
  );
}
