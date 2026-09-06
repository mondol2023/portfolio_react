"use client";

/**
 * Public API slot for the camera rig.
 *
 * All camera behaviour — the GSAP intro dolly and the scroll-linked drift —
 * lives in `systems/camera-system.ts`, which the world's system runner ticks
 * once per frame in its fixed order. Camera motion is gameplay logic, so it
 * runs through the same single `useFrame` as everything else rather than in
 * a component of its own (and nothing captured during render is mutated).
 *
 * The component stays exported as the module's stable public API slot — hosts
 * and future phases can hang camera-side decoration here — and renders
 * nothing by itself.
 */
export function CameraController() {
  return null;
}
