"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * A closer look at one piece of evidence.
 *
 * Built on the native `<dialog>` for the same reason `ui/dialog.tsx` is: focus
 * containment, background inertness, Escape and top-layer stacking are all
 * things the platform already does correctly and a hand-rolled overlay gets
 * subtly wrong. What is added here is the transition and the exhibition
 * framing — this is not the admin dialog with an image dropped into it, because
 * that one is a titled panel with a footer and this one is a lit wall.
 *
 * The move is deliberately *from somewhere*. `origin` is the centre of the
 * frame that was clicked, captured once on open, and the panel enters offset a
 * third of the way back toward it: enough that the enlargement reads as the
 * same artifact stepping forward, not enough to become a flight across the
 * screen. Closing plays it backwards toward the frame the reader is now on,
 * which is the one they will be looking at when the page returns.
 *
 * Nothing lives only in here. The image is the image the gallery already
 * rendered, at the same alt text, and the position line repeats what the
 * gallery's own numbering says — the viewer is a magnifier, not a second source
 * of content.
 */

export interface EvidenceItem {
  src: string;
  alt: string;
  /** Zero-padded exhibit number, as printed under the frame in the gallery. */
  number: string;
}

interface EvidenceViewerProps {
  items: EvidenceItem[];
  /** Index being inspected. Stays valid through the closing animation. */
  active: number;
  open: boolean;
  /** Viewport centre of the frame this was opened from, in px. */
  origin: { x: number; y: number } | null;
  /** The project, for the standing context line. */
  title: string;
  /** The chapter the evidence belongs to, so the reader never loses the story. */
  context?: string;
  onSelect: (index: number) => void;
  onClose: () => void;
  /** Fired once the dialog has actually closed, for focus return. */
  onClosed: () => void;
}

/** How much of the distance back to the original frame the panel travels. */
const ORIGIN_PULL = 0.32;

export function EvidenceViewer({
  items,
  active,
  open,
  origin,
  title,
  context,
  onSelect,
  onClose,
  onClosed,
}: EvidenceViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reducedMotion = useMotionPreference();

  const item = items[active];
  const many = items.length > 1;

  useEffect(() => {
    const element = dialogRef.current;
    if (open && element && !element.open) element.showModal();
  }, [open]);

  // `showModal()` makes the page behind inert but not unscrollable, and a
  // scrolling background under a fixed overlay is the one thing that makes a
  // lightbox feel broken on a phone.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (!many) return;
      onSelect((active + direction + items.length) % items.length);
    },
    [active, items.length, many, onSelect],
  );

  // Escape reaches the dialog as `cancel`. Cancelling it and closing through our
  // own state is what lets the exit animation play before the element actually
  // closes — and `onClose` below is the platform's close event, not a prop.
  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDialogElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    },
    [step],
  );

  const stopPropagation = useCallback((event: MouseEvent) => event.stopPropagation(), []);

  if (!item) return null;

  const offset =
    origin && !reducedMotion && typeof window !== "undefined"
      ? {
          x: (origin.x - window.innerWidth / 2) * ORIGIN_PULL,
          y: (origin.y - window.innerHeight / 2) * ORIGIN_PULL,
        }
      : { x: 0, y: 0 };

  // Under reduced motion the panel changes state rather than travelling: no
  // zoom, no drift back toward the frame, just the surface being there.
  const panelHidden = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.92, x: offset.x, y: offset.y };

  const panelShown = reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, y: 0 };

  const transition = { duration: reducedMotion ? 0.01 : DURATION.base, ease: EASE_OUT };
  const scrimTransition = { duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClose={onClosed}
      onKeyDown={handleKeyDown}
      aria-label={`${title} — evidence viewer`}
      className={cn(
        "m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0",
        // The UA backdrop is replaced by one that can be faded; leaving both
        // would dim the page twice.
        "backdrop:bg-transparent",
      )}
    >
      <AnimatePresence onExitComplete={() => dialogRef.current?.close()}>
        {open ? (
          <div key="viewer" className="relative flex h-full w-full items-center justify-center">
            {/*
              Clicking away is a pointer convenience and nothing more — every
              reader gets the close control, so this stays out of the tree.

              The scrim is the page's own ground carrying the chapter's own
              tone (`.story-scrim`), not a neutral black sheet: stepping into a
              screenshot dims the story the reader is in rather than replacing
              it with a different room, so closing returns them to a place they
              never actually left. `--tone` is inherited, so the tint is
              whichever act the evidence belongs to and it costs no props.
            */}
            <motion.div
              aria-hidden="true"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={scrimTransition}
              className="story-scrim absolute inset-0 bg-bg/92"
            />

            <motion.div
              initial={panelHidden}
              animate={panelShown}
              exit={panelHidden}
              transition={transition}
              onClick={stopPropagation}
              className="relative z-10 flex max-h-full w-full max-w-6xl flex-col px-3 py-4 sm:px-6 sm:py-6"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <p className="label-mono min-w-0">
                  <span className="block truncate text-fg">{title}</span>
                  <span className="mt-1 block text-fg-subtle">
                    {context ? `${context} · ` : ""}
                    {item.number} / {String(items.length).padStart(2, "0")}
                  </span>
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
                    "border border-border bg-surface text-fg-muted transition-colors",
                    "hover:bg-surface-hover hover:text-fg",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  )}
                >
                  <X className="size-4.5" aria-hidden="true" />
                  <span className="sr-only">Close viewer</span>
                </button>
              </div>

              {/*
                A viewport-relative band with the picture contained inside it,
                rather than a box sized to the picture. The gallery stores no
                dimensions, so anything sizing to the image would either
                letterbox a panorama into a square or push a tall screenshot
                past the viewport — `object-contain` in a fixed band handles
                both without knowing either. `svh` so the mobile URL bar cannot
                push the close control off screen.
              */}
              <div
                className={cn(
                  "story-frame relative h-[62svh] w-full overflow-hidden rounded-card",
                  "border border-border bg-bg-subtle shadow-floating sm:h-[72svh]",
                )}
              >
                <motion.div
                  key={item.src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={scrimTransition}
                  className="absolute inset-0"
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1280px) 72rem, 100vw"
                    className="object-contain"
                  />
                </motion.div>
              </div>

              {many ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <ViewerStep direction="previous" onClick={() => step(-1)} />
                  <ViewerStep direction="next" onClick={() => step(1)} />
                </div>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}

/** One of the two step controls. Same target size as the close button. */
function ViewerStep({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const next = direction === "next";
  const Icon = next ? ChevronRight : ChevronLeft;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4",
        "label-mono text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        next && "flex-row-reverse",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{next ? "Next" : "Previous"}</span>
      <span className="sr-only">evidence</span>
    </button>
  );
}
