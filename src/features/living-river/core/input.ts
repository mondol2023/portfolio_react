/**
 * Everything the reader does, collected without ever intercepting it.
 *
 * The scene's layers are `pointer-events: none` — they must be, or every link
 * and button on the page would stop working — so nothing here listens on the
 * canvases. It listens on `window`, in the capture phase, passively: the
 * events still reach whatever the reader actually clicked, and the river gets
 * to react to them on the way past.
 *
 * This module records and nothing more. It does not know where the camera is
 * or what a ripple costs, so it cannot decide *where* on the water a tap
 * landed; it just queues "a tap happened at these pixels" and lets `world.ts`
 * drain the queue once per frame, when the camera for that frame is settled.
 * Draining rather than dispatching also means a burst of twenty pointermove
 * events between two paints costs one reaction, not twenty.
 */

export interface Touch {
  /** CSS pixels, viewport-relative. */
  x: number;
  y: number;
  /** 0..1 — a deliberate tap is a 1, the wake dragged by a moving cursor is less. */
  strength: number;
}

export interface InputState {
  pointerX: number;
  pointerY: number;
  /** False before the first move, and after the pointer leaves the window. */
  hasPointer: boolean;
  /** Page scroll as a 0 (top) → 1 (bottom) fraction. */
  scroll: number;
  /** Fractions of the page per second, signed. Decays in `world.ts`. */
  scrollVelocity: number;
}

export interface Input {
  state: InputState;
  /** Returns the touches queued since the last call, and empties the queue. */
  drainTouches(): Touch[];
  dispose(): void;
}

/** Pixels the pointer must travel before it drags another ripple off itself. */
const WAKE_SPACING = 46;

export function createInput(): Input {
  const state: InputState = {
    pointerX: 0,
    pointerY: 0,
    hasPointer: false,
    scroll: 0,
    scrollVelocity: 0,
  };

  let touches: Touch[] = [];
  let lastWakeX = 0;
  let lastWakeY = 0;
  let lastScroll = 0;
  let lastScrollAt = performance.now();

  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    const now = performance.now();
    const elapsed = Math.max(16, now - lastScrollAt) / 1000;

    /*
     * Velocity is taken here rather than differenced in the render loop
     * because scroll events and frames are not the same clock: a flick that
     * lands entirely between two paints still has a speed, and it is that
     * speed the wind is supposed to answer to.
     */
    state.scrollVelocity = (next - lastScroll) / elapsed;
    state.scroll = next;

    lastScroll = next;
    lastScrollAt = now;
  }

  /**
   * A resize moves the scroll *fraction* without the reader having scrolled.
   *
   * The page got taller or shorter, so the same pixel offset is now a
   * different fraction of it — rotating a phone can move it by a third. Put
   * through `readScroll` that arrives as an enormous velocity, and the scene
   * answers a device rotation with a surge downstream. So the position is
   * re-read and the difference deliberately thrown away.
   */
  function onResize() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    lastScroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    lastScrollAt = performance.now();
    state.scroll = lastScroll;
    state.scrollVelocity = 0;
  }

  function onPointerMove(event: PointerEvent) {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;

    if (!state.hasPointer) {
      state.hasPointer = true;
      lastWakeX = event.clientX;
      lastWakeY = event.clientY;
      return;
    }

    // A wake, not a trail of dots: one ripple per fixed distance travelled, so
    // a slow drag and a fast swipe leave the same spacing behind them.
    if (Math.hypot(event.clientX - lastWakeX, event.clientY - lastWakeY) >= WAKE_SPACING) {
      lastWakeX = event.clientX;
      lastWakeY = event.clientY;
      touches.push({ x: event.clientX, y: event.clientY, strength: 0.28 });
    }
  }

  function onPointerDown(event: PointerEvent) {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.hasPointer = true;
    touches.push({ x: event.clientX, y: event.clientY, strength: 1 });
  }

  function onPointerOut(event: PointerEvent) {
    // `relatedTarget === null` is the pointer leaving the window entirely, as
    // opposed to crossing between two elements inside it.
    if (event.relatedTarget === null) state.hasPointer = false;
  }

  function onBlur() {
    state.hasPointer = false;
  }

  const passive = { passive: true, capture: true } as const;

  window.addEventListener("pointermove", onPointerMove, passive);
  window.addEventListener("pointerdown", onPointerDown, passive);
  window.addEventListener("pointerout", onPointerOut, passive);
  window.addEventListener("blur", onBlur);
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", onResize);
  readScroll();

  return {
    state,

    drainTouches() {
      const drained = touches;
      touches = [];
      return drained;
    },

    dispose() {
      window.removeEventListener("pointermove", onPointerMove, passive);
      window.removeEventListener("pointerdown", onPointerDown, passive);
      window.removeEventListener("pointerout", onPointerOut, passive);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", onResize);
      touches = [];
    },
  };
}
