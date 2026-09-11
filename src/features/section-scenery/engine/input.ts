import { approach, clamp01, lerp } from "./math";
import { createNoise1 } from "./noise";

/**
 * What the reader is doing, in a form a scene can draw with.
 *
 * Three problems are solved here once instead of six times:
 *
 * 1. **Raw pointer coordinates are unusable.** `pointermove` fires in bursts and
 *    stops dead between them. Anything that follows it directly stutters. Every
 *    value below is smoothed with a time constant, in the loop, once per frame.
 * 2. **Nobody has a pointer on a phone.** A backdrop that only comes alive under
 *    a mouse is dead for half the audience, so when no pointer is present the
 *    focus point wanders on a noise path instead. Scenes read the same field
 *    either way; `presence` says how much of it is really the reader.
 * 3. **Reading the scroll position costs a layout.** `window.scrollY` inside the
 *    render loop can force a style recalculation. It is cached from a passive
 *    listener and the loop only ever reads the cache.
 */

export interface PointerState {
  /** Smoothed focus point in CSS px, viewport coordinates. Always meaningful —
   *  it is the wander path when nobody is pointing at anything. */
  x: number;
  y: number;
  /** The same point as `-1 … 1` from the centre. What parallax wants. */
  nx: number;
  ny: number;
  /** Smoothed velocity of the focus point, in CSS px per second. */
  vx: number;
  vy: number;
  speed: number;
  /** 0 → 1: how much of the focus point is an actual reader rather than the
   *  idle wander. Direct-manipulation effects should scale by this; ambient
   *  ones (wind, parallax) are welcome to ignore it. */
  presence: number;
}

export interface ScrollState {
  /** Document scroll offset in CSS px. */
  y: number;
  /** Smoothed scroll velocity, px per second. Signed: negative is upward. */
  velocity: number;
}

export interface FrameInput {
  pointer: PointerState;
  scroll: ScrollState;
}

export interface InputTracker {
  /** Advance and return the shared state. Called once per frame by the loop —
   *  the object is reused, so scenes must read it and not hold onto it. */
  read(dt: number, width: number, height: number): FrameInput;
  stop(): void;
}

/** Seconds for the focus point to catch up with the pointer. Long enough to
 *  absorb the burstiness, short enough to still feel attached to the hand. */
const FOLLOW = 0.2;
/** Velocity is smoothed harder than position: it is a derivative, so it carries
 *  twice the noise and is used for gusts, which should feel like weather. */
const VELOCITY_FOLLOW = 0.14;
const SCROLL_FOLLOW = 0.16;

const PRESENCE_RISE = 0.16;
const PRESENCE_FALL = 1.1;
/** No pointer movement for this long and the reader is treated as gone — they
 *  are reading, not pointing, and the scenery should stop leaning at them. */
const IDLE_SECONDS = 2.4;

/** Laps per second of the idle wander. Deliberately slower than anything a hand
 *  does, so it never reads as a fake cursor. */
const WANDER_RATE = 0.05;

export function createInputTracker(): InputTracker {
  const pointer: PointerState = {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.45,
    nx: 0,
    ny: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    presence: 0,
  };

  const scroll: ScrollState = { y: window.scrollY, velocity: 0 };
  const frame: FrameInput = { pointer, scroll };

  const wanderX = createNoise1();
  const wanderY = createNoise1();
  let wanderTime = 0;

  let rawX = pointer.x;
  let rawY = pointer.y;
  let seen = false;
  let sinceMove = IDLE_SECONDS;
  let scrollY = scroll.y;

  function onPointer(event: PointerEvent) {
    rawX = event.clientX;
    rawY = event.clientY;
    seen = true;
    sinceMove = 0;
  }

  /** Pointer gone from the window entirely. Starting the decay immediately is
   *  kinder than waiting out the idle timer with the scenery still leaning
   *  toward wherever the cursor left. */
  function onLeave() {
    sinceMove = IDLE_SECONDS;
  }

  function onScroll() {
    scrollY = window.scrollY;
  }

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  window.addEventListener("blur", onLeave);
  document.addEventListener("pointerleave", onLeave, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    read(dt, width, height) {
      sinceMove += dt;

      const here = seen && sinceMove < IDLE_SECONDS ? 1 : 0;
      pointer.presence = approach(
        pointer.presence,
        here,
        here > pointer.presence ? PRESENCE_RISE : PRESENCE_FALL,
        dt,
      );

      wanderTime += dt;
      const driftX = (0.5 + wanderX(wanderTime * WANDER_RATE) * 0.4) * width;
      const driftY = (0.45 + wanderY(wanderTime * WANDER_RATE * 0.8) * 0.3) * height;

      // Blending by `presence` rather than switching means the handover between
      // a real cursor and the wander is a drift, never a jump.
      const targetX = lerp(driftX, rawX, pointer.presence);
      const targetY = lerp(driftY, rawY, pointer.presence);

      const nextX = approach(pointer.x, targetX, FOLLOW, dt);
      const nextY = approach(pointer.y, targetY, FOLLOW, dt);

      // Velocity of the *smoothed* point, not of the raw events: it is what the
      // scenes actually see moving, so a gust matches the motion on screen.
      if (dt > 0) {
        pointer.vx = approach(pointer.vx, (nextX - pointer.x) / dt, VELOCITY_FOLLOW, dt);
        pointer.vy = approach(pointer.vy, (nextY - pointer.y) / dt, VELOCITY_FOLLOW, dt);
      }
      pointer.speed = Math.hypot(pointer.vx, pointer.vy);

      pointer.x = nextX;
      pointer.y = nextY;
      pointer.nx = width > 0 ? clamp01(nextX / width) * 2 - 1 : 0;
      pointer.ny = height > 0 ? clamp01(nextY / height) * 2 - 1 : 0;

      if (dt > 0) {
        scroll.velocity = approach(scroll.velocity, (scrollY - scroll.y) / dt, SCROLL_FOLLOW, dt);
      }
      scroll.y = scrollY;

      return frame;
    },

    stop() {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    },
  };
}
