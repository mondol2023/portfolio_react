import { clamp } from "./num";

/** Longest step we ever simulate. A tab that was throttled resumes, it never teleports. */
const MAX_DT = 1 / 20;

/** Frame cost above this (ms) is "too slow"; below the lower bound we can afford more pixels. */
const SLOW_FRAME_MS = 22;
const FAST_FRAME_MS = 13;

/** Render scale bounds. 1 = one canvas pixel per CSS pixel (before dpr). */
const MIN_SCALE = 0.5;
const MAX_SCALE = 1;

export interface Clock {
  /** Current adaptive render scale, 0.5..1. Renderers multiply their backing store by this. */
  readonly scale: number;
  stop(): void;
}

export interface ClockOptions {
  /** Called once per animation frame with a clamped delta in seconds. */
  frame(dt: number, scale: number): void;
  /** Called when the quality guard changes the render scale, so buffers can be resized. */
  onScaleChange?(scale: number): void;
}

/**
 * A requestAnimationFrame driver with three jobs:
 *
 * 1. Hand out a clamped delta so physics stays stable across stalls.
 * 2. Pause entirely while the document is hidden — a backdrop nobody can see costs nothing.
 * 3. Watch a rolling average of frame cost and trade resolution for smoothness.
 */
export function createClock({ frame, onScaleChange }: ClockOptions): Clock {
  let raf = 0;
  let last = 0;
  let running = false;
  let scale = MAX_SCALE;

  // Rolling average of frame cost, seeded optimistically so we start at full resolution.
  let averageMs = 16;
  // Frames to ignore after a scale change, so the resize itself is not measured.
  let settle = 30;

  const state = {
    get scale() {
      return scale;
    },
    stop,
  };

  function measure(elapsedMs: number) {
    averageMs += (elapsedMs - averageMs) * 0.06;
    if (settle > 0) {
      settle -= 1;
      return;
    }
    const next =
      averageMs > SLOW_FRAME_MS
        ? scale - 0.1
        : averageMs < FAST_FRAME_MS
          ? scale + 0.05
          : scale;
    const clamped = clamp(Number(next.toFixed(3)), MIN_SCALE, MAX_SCALE);
    if (clamped !== scale) {
      scale = clamped;
      settle = 30;
      onScaleChange?.(scale);
    }
  }

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const elapsedMs = now - last;
    last = now;
    measure(elapsedMs);
    frame(clamp(elapsedMs / 1000, 0, MAX_DT), scale);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function onVisibility() {
    if (document.hidden) pause();
    else start();
  }

  function stop() {
    pause();
    document.removeEventListener("visibilitychange", onVisibility);
  }

  document.addEventListener("visibilitychange", onVisibility);
  if (!document.hidden) start();

  return state;
}
