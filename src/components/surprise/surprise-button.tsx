"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { BLAST_MS, BombBlast } from "./bomb-blast";
import { resolveAnimations } from "./catalog";
import { describeCombo, pickCombo } from "./combo";
import { type SurpriseEffect } from "./effect";
import { REVEAL_DIP_MS, revealContents } from "./reveal";
import { useSurpriseEffects } from "./use-surprise-effects";

/**
 * The whole toy, behind one button.
 *
 * Press it and a bomb comes in from off-screen, detonates mid-viewport, and one
 * to three things about the page are different when the smoke clears — a new
 * colour scheme, a different typeface, hollow headings, a night sky, snow,
 * grain, square corners. The words on the page never change; only how they are
 * presented does.
 *
 * Every effect in `./effects` and the blast in `./bomb-blast` stand alone and
 * can be used one at a time somewhere else — see the note in
 * `./effects/index.ts`. This is the bundle, so deleting `<SurpriseButton />`
 * from the layout removes the button and the bomb entirely and leaves the parts
 * intact for reuse. The other way in is `<SiteAnimations />`, which wears
 * whatever the dashboard pinned, permanently and without the theatre; the two
 * are independent, and `pinned` below is only how this one is told to stay out
 * of the other's way.
 *
 * What gets drawn, and why a draw is always both new and coherent, is in
 * `./combo.ts`. When it gets drawn is a three-way arrangement between this
 * file, `./bomb-blast.tsx` and `./reveal.ts`, and the order matters:
 *
 *   detonation   the wash starts rising, and the content starts leaving.
 *   +260ms       the content is gone. The effects are applied here — under the
 *                thickest smoke, over a page that is no longer on screen, so
 *                nothing about the change is ever witnessed happening.
 *   +1.7s        the smoke has finished clearing over an empty page, and stays
 *                empty for a beat afterwards.
 *   then         the new page develops in over a second and a half, section by
 *                section, and the chip says what changed.
 *
 * The blank beat in the middle is the point. The wash is a radial gradient and
 * never covers the corners of the viewport, so there is no moment at which the
 * smoke alone can be trusted to hide a swap.
 */

/** How long the "here is what just happened" chip stays up. */
const NOTE_MS = 3600;

/** Empty screen after the last of the smoke, before the page starts coming back. */
const PAUSE_MS = 120;

/**
 * How long the page stays blank for a blast: everything from the moment it
 * finishes leaving to the moment the smoke is gone, plus the pause.
 */
const BLAST_BLANK_MS = BLAST_MS - REVEAL_DIP_MS + PAUSE_MS;

/** Nothing is covering the screen on a reset, so it only dips long enough to swap. */
const RESET_BLANK_MS = 110;

/** A stable empty array, so resetting does not hand the hook a new identity. */
const NONE: readonly SurpriseEffect[] = [];

interface SurpriseButtonProps {
  className?: string;
  /**
   * Effect ids the dashboard has switched on for everyone.
   *
   * The button neither draws these nor clears them — they are the page's normal
   * now, and "Back to normal" means back to them. Passing them through matters
   * for composition rather than bookkeeping: without it a press could deal a
   * second backdrop on top of a pinned one, which is the exact collision
   * `./combo.ts` exists to prevent.
   */
  pinned?: readonly string[];
}

export function SurpriseButton({ className, pinned }: SurpriseButtonProps) {
  const still = useMotionPreference();

  // Joined, for the same reason `<SiteAnimations />` does it: the prop is a new
  // array on every render of the layout above.
  const pinnedKey = (pinned ?? []).join(",");
  const held = useMemo(
    () => resolveAnimations(pinnedKey === "" ? [] : pinnedKey.split(",")),
    [pinnedKey],
  );

  /** Non-null while a blast is on screen; the value re-keys `BombBlast` to replay it. */
  const [blast, setBlast] = useState<number | null>(null);
  const [effects, setEffects] = useState<readonly SurpriseEffect[]>(NONE);
  const [note, setNote] = useState("");

  // Applying a new set runs the previous set's undos first, so the page is
  // never wearing two draws at once.
  useSurpriseEffects(effects);

  /*
   * The blast's callbacks are stable, so what is running has to be readable
   * without re-creating them. A ref rather than the state value keeps
   * `handleReveal` from changing identity every time a draw lands — which
   * would remount the bomb mid-flight.
   */
  const running = useRef<readonly SurpriseEffect[]>(NONE);

  /** The reveal in flight, and the timers scheduled against it. */
  const reveal = useRef<(() => void) | null>(null);
  const timers = useRef<number[]>([]);

  const stopTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(""), NOTE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  // Unmounting mid-reveal would otherwise leave the page held at opacity 0 by an
  // animation whose stylesheet nobody is left to remove.
  useEffect(() => {
    return () => {
      stopTimers();
      reveal.current?.();
    };
  }, [stopTimers]);

  const fire = () => {
    if (blast !== null) return;
    setBlast(Date.now());
  };

  /**
   * Puts the page into a new set — or back to none — without the swap itself
   * being visible. The content leaves, changes while it is gone, and develops
   * back in `blankMs` later.
   *
   * The chip waits for the page rather than going up with the effects: it is a
   * caption for something the reader cannot see yet, and on a blank screen it
   * would be the only thing on it. Reduced motion gets the change and the
   * caption at once, with none of the choreography.
   */
  const change = useCallback(
    (next: readonly SurpriseEffect[], text: string, blankMs: number) => {
      stopTimers();

      const apply = () => {
        running.current = next;
        setEffects(next);
      };

      if (still) {
        apply();
        setNote(text);
        return;
      }

      reveal.current = revealContents(blankMs);
      timers.current = [
        window.setTimeout(apply, REVEAL_DIP_MS),
        window.setTimeout(() => setNote(text), REVEAL_DIP_MS + blankMs),
      ];
    },
    [still, stopTimers],
  );

  const handleBlast = useCallback(() => {
    const next = pickCombo(running.current, !still, held);
    if (next.length === 0) return;

    change(next, describeCombo(next), BLAST_BLANK_MS);
  }, [change, held, still]);

  const handleDone = useCallback(() => setBlast(null), []);

  const reset = () => change(NONE, "Back to normal", RESET_BLANK_MS);

  return (
    <>
      {blast !== null ? <BombBlast key={blast} onBlast={handleBlast} onDone={handleDone} /> : null}

      <div
        className={cn(
          "pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6",
          className,
        )}
      >
        {/*
         * Always rendered, only faded: a live region has to be in the document
         * before its text changes, or there is nothing for a screen reader to
         * have been watching when the announcement arrives.
         */}
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "max-w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface/90",
            "px-3.5 py-1.5 text-right text-xs font-medium text-fg shadow-md backdrop-blur",
            "transition-[opacity,transform] duration-300",
            note ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0",
          )}
        >
          {note}
        </p>

        {/* Re-enabled here: the column itself is inert so it never eats clicks. */}
        <div className="pointer-events-auto flex items-center gap-2">
          {effects.length > 0 ? (
            <button
              type="button"
              onClick={reset}
              title="Put the page back"
              className={buttonClasses("secondary", "sm", "size-9 px-0 shadow-md")}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="sr-only">Put the page back</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={fire}
            disabled={blast !== null}
            className={buttonClasses(
              "primary",
              "md",
              "shadow-lg motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
            )}
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Surprise
          </button>
        </div>
      </div>
    </>
  );
}
