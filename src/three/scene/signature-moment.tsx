"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import {
  SIGNATURE_SECTION_INDEX,
  resetSignature,
  signature,
  signatureAt,
  signatureRamp,
  type SignatureMode,
} from "@/lib/experience/scene-signature";

import { sceneSectionProgress } from "./camera-rig";

/**
 * Publishes the signature moment's beats once per frame and renders nothing.
 * Mounted right after `<ScrollPhysics>`, so consumers below read this frame's
 * spring output and the beats derived from it, both already settled.
 *
 * D4 answered: no pinning. The hold beat is a plateau in the beat table, not a
 * locked scroll position, so §5's "never traps" is structural — reverse scroll
 * reverses, a flick lands on the end state, and GSAP stays out of `src/three`.
 */

/** Once per session (§5): a replay gets the compressed variant instead. */
const SEEN_KEY = "portfolio:signature-seen";

/** The DOM element whose opacity the moment dims, and the property it reads. */
const DIM_SELECTOR = "[data-signature-dim]";
const DIM_PROPERTY = "--signature-dim";
/** What the cards fade to at full dim (§5 beat 1). */
const CARD_DIM = 0.15;
/** Below this the write is invisible and only costs a style recalc. */
const DIM_EPSILON = 0.004;

interface SignatureMomentProps {
  /** The "three-signature" switch, plus whether there is a lead project for it to play on. */
  enabled: boolean;
  reducedMotion: boolean;
  budget: SceneBudget;
}

function readSeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Private mode and blocked storage throw; unseen plays twice at worst.
    return false;
  }
}

function markSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* see above */
  }
}

export function SignatureMoment({ enabled, reducedMotion, budget }: SignatureMomentProps) {
  const seen = useRef(false);
  // Latched on entry: re-resolving per frame would let a tier step-down or the
  // seen flag swap variants mid-play, which is a visible jump.
  const playing = useRef<SignatureMode | null>(null);
  const dimTarget = useRef<HTMLElement | null>(null);
  const dimWritten = useRef(1);

  useEffect(() => {
    seen.current = readSeen();
  }, []);

  useEffect(() => {
    return () => {
      resetSignature();
      dimTarget.current?.style.removeProperty(DIM_PROPERTY);
      dimTarget.current = null;
      dimWritten.current = 1;
    };
  }, [enabled]);

  useFrame(() => {
    if (!enabled) return;

    const t = signatureRamp(sceneSectionProgress(sceneScroll.progress, SIGNATURE_SECTION_INDEX));

    if (t >= 1) {
      // Marked here, not at a beat edge: both variants rest on the same end
      // state, so the next traversal simply starts compressed.
      if (playing.current && !seen.current) {
        seen.current = true;
        markSeen();
      }
      playing.current = null;
    } else if (t <= 0) {
      // Backed out the near end — not seen, and the next entry plays in full.
      playing.current = null;
    } else if (!playing.current) {
      playing.current = reducedMotion
        ? "dissolve"
        : budget.tier === "low" || seen.current
          ? "compressed"
          : "full";
      // Only the home page has the card grid; resolved on entry, not per frame.
      dimTarget.current = document.querySelector<HTMLElement>(DIM_SELECTOR);
    }

    Object.assign(signature, signatureAt(t, playing.current ?? "off"));

    const target = dimTarget.current;
    if (!target) return;
    const opacity = 1 - signature.dim * (1 - CARD_DIM);
    if (Math.abs(opacity - dimWritten.current) < DIM_EPSILON) return;
    dimWritten.current = opacity;
    // A custom property, so the write never crosses React and the grid keeps
    // the var's own fallback when there is no scene at all.
    target.style.setProperty(DIM_PROPERTY, opacity.toFixed(3));
  });

  return null;
}
