"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

interface FpsMonitorProps {
  /** Only worth sampling while the loop is actually running continuously. */
  enabled: boolean;
  onSustainedDrop: () => void;
}

/**
 * Runtime correction for a wrong static guess.
 *
 * `device-tier.ts`'s `classify()` only sees `deviceMemory` /
 * `hardwareConcurrency` before a single frame has drawn, and both are absent
 * or lied about on plenty of real hardware. This is the other half: if the
 * scene is actually struggling once it's running, step the budget down for
 * the rest of the session instead of leaving a device stuck at a tier it
 * can't hold.
 *
 * Deliberately coarse and one-shot. A rolling window (not a single slow
 * frame) so one GC pause or asset decode doesn't trigger it, a majority-of-
 * the-window threshold so a handful of stutters in an otherwise fine window
 * doesn't either, and it fires at most once — re-arming would let the scene
 * flip tiers back and forth as load comes and goes, which reads as far more
 * broken than staying one notch down for good.
 */
const SAMPLE_WINDOW_FRAMES = 90;
const LOW_FPS_THRESHOLD = 40;
const LOW_FRAME_RATIO_TO_TRIGGER = 0.6;

export function FpsMonitor({ enabled, onSustainedDrop }: FpsMonitorProps) {
  const framesSeen = useRef(0);
  const lowFrames = useRef(0);
  const fired = useRef(false);

  useFrame((_state, delta) => {
    if (!enabled || fired.current || delta <= 0) return;

    framesSeen.current += 1;
    if (1 / delta < LOW_FPS_THRESHOLD) lowFrames.current += 1;

    if (framesSeen.current < SAMPLE_WINDOW_FRAMES) return;

    if (lowFrames.current / framesSeen.current > LOW_FRAME_RATIO_TO_TRIGGER) {
      fired.current = true;
      onSustainedDrop();
    } else {
      framesSeen.current = 0;
      lowFrames.current = 0;
    }
  });

  return null;
}
