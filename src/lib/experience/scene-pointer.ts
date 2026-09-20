/**
 * Pointer press, frame-synced. A module singleton for the same reason
 * `scene-scroll.ts` is one: read inside `useFrame`, so it must never
 * re-render the canvas subtree. Id-shaped intent stays in the store (D1);
 * continuous per-frame values live here.
 */

export interface ScenePointer {
  /** True between pointerdown and pointerup. Never set by a touch pointer. */
  pressed: boolean;
  /** Increments on every press, so `useFrame` can see a *new* one rather than a held one. */
  pressStamp: number;
  /** False when the press landed on a link, button or field — that click is not ours to take. */
  grabAllowed: boolean;
  /** Client coords and timestamp at press — the origin `wasClick` measures a release against. */
  pressStartX: number;
  pressStartY: number;
  pressStartTime: number;
  /** Increments on every release, so `useFrame` can see a *new* one rather than a held one. */
  releaseStamp: number;
  /** Whether the release that produced `releaseStamp` classified as a click (§6.2). False for a drag, a cancel, or a blur. */
  lastReleaseWasClick: boolean;
  /** `grabAllowed` as it stood at that same release, captured before `onRelease` clears it. */
  lastReleaseGrabAllowed: boolean;
}

export const scenePointer: ScenePointer = {
  pressed: false,
  pressStamp: 0,
  grabAllowed: false,
  pressStartX: 0,
  pressStartY: 0,
  pressStartTime: 0,
  releaseStamp: 0,
  lastReleaseWasClick: false,
  lastReleaseGrabAllowed: false,
};

/** How far and how fast a release must land to count as a click, not a drag (§6.2). */
const CLICK_MAX_DISTANCE = 12;
const CLICK_MAX_DURATION = 400;

/** A real click, not a drag — released within 12px and 400ms of press (§6.2). */
export function wasClick(upX: number, upY: number, upTime: number): boolean {
  const dx = upX - scenePointer.pressStartX;
  const dy = upY - scenePointer.pressStartY;
  return Math.hypot(dx, dy) <= CLICK_MAX_DISTANCE && upTime - scenePointer.pressStartTime <= CLICK_MAX_DURATION;
}

/** Body class carrying the grab cursor and selection lock; see `globals.css`. */
const DRAGGING_CLASS = "scene-dragging";

/** Called twice per drag, not per frame — a DOM write from `useFrame` only affords that. */
export function setSceneDragging(active: boolean): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle(DRAGGING_CLASS, active);
}
