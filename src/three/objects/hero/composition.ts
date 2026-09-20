"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { heroColumnRightFraction } from "@/lib/experience/scene-layout";
import { dampFactor, SCENE_SMOOTHING } from "@/lib/experience/scene-motion";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { sceneTime } from "@/lib/experience/scene-timer";

import { sceneSectionEnvelope, sceneSectionProgress } from "../../scene/camera-rig";

/**
 * Hero's shared composition: where the form sits, how large it is, how
 * present it is. Every scenery's hero answers these identically — only the
 * *object* and its motion temperament differ (S3) — so the arithmetic lives
 * here once instead of in each of the four forms.
 */

/** Never shrink past this: below it the form reads as a speck, not an object. */
const MIN_FIT = 0.52;
/**
 * How much of the frame's half-width the form keeps clear of the right edge.
 *
 * Centring on the free edge fills it exactly, which puts the silhouette's
 * outer edge *on* the frame's — and once `fit` bottoms out at `MIN_FIT` the
 * form is wider than the edge it is centred in, so it hangs off it: measured
 * at the right frame edge in NDC, 1.00 at 1440×900, 1.18 at 1024×820 and 1.66
 * at 390×844, with blueprint's cage worst at 1.93. A form cut by the viewport
 * reads as an accident rather than a composition, so the centre pulls back
 * until the silhouette closes. It is a margin, not a fit: where the gutter is
 * real the form still fills it, and where it is not the form keeps its size
 * and falls to `COLUMN_FLOOR` as before.
 */
const EDGE_MARGIN = 0.04;
/** What presence is left where it still crosses the column — `drifters.tsx`'s floor. */
export const COLUMN_FLOOR = 0.12;

/**
 * Hero's live rotation *and* lateral position, read by About's fragments so
 * the shell they split from keeps spinning — and stays where it actually is —
 * through the handoff. A module-scope mutable rather than a store: this is one
 * scene object informing another, not a DOM to 3D bridge, so the store
 * contract in `scene-interaction-store.ts` does not apply.
 */
export const heroShellSpin = { angle: 0, x: 0 };

/**
 * A scenery's hero motion, as data. The four worlds differ by these numbers
 * and by their geometry — never by a branch inside a form file.
 */
export interface HeroTemperament {
  /** Continuous idle revolution, rad/s. `0` holds still — blueprint and garden. */
  idleSpeed: number;
  /** Breathing scale amplitude. `0` disables the pulse entirely. */
  breathAmount: number;
  /** Breathing cycle, seconds. Ignored when `breathAmount` is 0. */
  breathSeconds: number;
  /** Max damped pointer parallax, radians. */
  maxTilt: number;
  /** Scroll-driven rotation across Hero's own span, radians. */
  scrollRotation: number;
  /** Seconds the form takes to finish arriving — drives each world's entrance. */
  arriveSeconds: number;
  /**
   * The form's own half-extent at scale 1 — the furthest any part of it
   * reaches from its centre, which is what the fit and overlap maths below
   * measure against.
   *
   * Per form, not shared: blueprint's bounding cage reaches its *corner*
   * (`CAGE × √3`), half again as far as atelier's ring, so one constant for
   * all four silently let the drafting view overflow the gutter and clip off
   * the right edge of the page.
   */
  halfExtent: number;
}

export interface HeroFormProps {
  tone: string;
  toneSoft: string;
  pointer: { current: { x: number; y: number } };
  reducedMotion: boolean;
  /** Hero's own waypoint index — its span drives the form's scroll rotation. */
  sectionIndex: number;
  /** Whose exit ramp fades the form out; Hero borrows the next section's. */
  exitIndex: number;
  budget: SceneBudget;
}

/** This frame's composition, handed to a form so it can paint itself. */
export interface HeroFrame {
  /** How clear of the reading column the form is, `COLUMN_FLOOR` to 1. Drives opacity. */
  columnPresence: number;
  /** How much of Hero's story is left: 1 to 0 across the exit ramp. */
  presence: number;
  /** The scale that fits the form into the hero's free edge. */
  fit: number;
  /** Raw progress through Hero's own waypoint span, 0 to 1. */
  progress: number;
  /** One-shot arrival, 0 to 1 over `arriveSeconds`. Starts at 1 under reduced motion. */
  arrive: number;
  delta: number;
}

/** Reused across frames and forms — only one hero is mounted at a time. */
const frame: HeroFrame = {
  columnPresence: 1,
  presence: 1,
  fit: 1,
  progress: 0,
  arrive: 1,
  delta: 0,
};

/**
 * Places, scales and spins Hero's form, then hands the frame to `onFrame` so
 * the form paints its own materials in the same tick. One `useFrame` per hero
 * rather than a host loop plus a form loop, and `sceneTime` / `sceneScroll`
 * stay the only sources of time and scroll (Part 12).
 *
 * The form composes *beside* the hero's text, never behind it. Hero's block is
 * `max-w-4xl` and left-aligned, so its free space is one asymmetric edge
 * rather than the symmetric gutter `contentSafeFraction` models — hence
 * `heroColumnRightFraction`. Below ~1200px there is no hero gutter at all;
 * rather than grow a second mobile-only composition the form keeps its
 * placement and falls away to `COLUMN_FLOOR`, so type stays the dominant
 * layer. One rule, scaled — S11.
 */
export function useHeroComposition(
  groupRef: RefObject<THREE.Group | null>,
  props: HeroFormProps,
  temperament: HeroTemperament,
  onFrame?: (frame: HeroFrame) => void,
) {
  const { pointer, reducedMotion, sectionIndex, exitIndex } = props;
  const idleAngle = useRef(0);
  const arrived = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const group = groupRef.current;
    const { camera } = state;
    if (!group || !(camera instanceof THREE.PerspectiveCamera)) return;

    // Read per frame, not taken as a prop: scroll moves every frame, and
    // re-rendering the canvas at that rate is what `<ScrollPhysics>` avoids.
    const heroProgress = sceneSectionProgress(sceneScroll.progress, sectionIndex);
    const { exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, exitIndex);

    // Reduced motion starts arrived. The landed pose is the designed still
    // state, not a fast-forward of the entrance (D7, Part 10).
    if (reducedMotion) {
      arrived.current = 1;
    } else if (arrived.current < 1) {
      arrived.current = Math.min(1, arrived.current + delta / Math.max(0.001, temperament.arriveSeconds));
    }

    if (!reducedMotion) {
      idleAngle.current += delta * temperament.idleSpeed;
    }

    // Reduced motion: the parallax target collapses to centre and the damp is
    // 1, so tilt lands there rather than easing out — nothing keeps running.
    const targetTiltX = reducedMotion ? 0 : pointer.current.y * temperament.maxTilt;
    const targetTiltY = reducedMotion ? 0 : pointer.current.x * temperament.maxTilt;
    const follow = reducedMotion ? 1 : dampFactor(SCENE_SMOOTHING.glide, delta);
    tilt.current.x = THREE.MathUtils.lerp(tilt.current.x, targetTiltX, follow);
    tilt.current.y = THREE.MathUtils.lerp(tilt.current.y, targetTiltY, follow);

    group.rotation.y = idleAngle.current + tilt.current.y + heroProgress * temperament.scrollRotation;
    group.rotation.x = tilt.current.x;
    heroShellSpin.angle = group.rotation.y;

    // Recomputed per frame because the lens itself moves: fov is damped toward
    // each waypoint's, so the frame the form must fit inside is not a constant
    // even at a fixed viewport size.
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * Math.max(0.1, camera.position.z);
    const halfW = halfH * camera.aspect;
    const columnFrac = heroColumnRightFraction(state.size.width);
    const freeHalf = Math.max(0, 1 - columnFrac) * 0.5;
    const fit = THREE.MathUtils.clamp((freeHalf * halfW) / temperament.halfExtent, MIN_FIT, 1);

    // How far it still reaches back over the reading column, measured against
    // its own width so the falloff is the same shape at every viewport.
    const reach = Math.max(temperament.halfExtent * fit, 0.001);
    const centreX = Math.min((columnFrac + freeHalf) * halfW, halfW * (1 - EDGE_MARGIN) - reach);
    const overlap = Math.max(0, columnFrac * halfW - (centreX - reach));
    const clear = 1 - THREE.MathUtils.smoothstep(overlap / (reach * 2), 0, 0.6);
    const columnPresence = THREE.MathUtils.lerp(COLUMN_FLOOR, 1, clear);

    group.position.x = centreX;
    heroShellSpin.x = centreX;

    const breathe =
      reducedMotion || temperament.breathAmount === 0
        ? 1
        : 1 + Math.sin((sceneTime.elapsed * Math.PI * 2) / temperament.breathSeconds) * temperament.breathAmount;
    // Recedes once the story has moved on — a scale fade, not an abrupt
    // unmount, so the hand-off to About's fragments stays continuous.
    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    group.scale.setScalar(breathe * presence * fit * THREE.MathUtils.lerp(0.82, 1, arrived.current));

    frame.columnPresence = columnPresence;
    frame.presence = presence;
    frame.fit = fit;
    frame.progress = heroProgress;
    frame.arrive = arrived.current;
    frame.delta = delta;
    onFrame?.(frame);
  });
}
