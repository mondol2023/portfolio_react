import { fadeIn, injectStyle, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Turns the lights off and hands the reader a torch.
 *
 * A dim sheet over the whole page with a soft hole cut in it that follows the
 * pointer. The dim is a neutral black at low alpha rather than a themed colour,
 * because it has to darken a near-white page and a near-black one without
 * either going muddy.
 *
 * Two details keep it cheap. The pointer position is written as two custom
 * properties on the layer and consumed by a single `radial-gradient`, so a move
 * repaints one element and touches no layout. And the write is coalesced into
 * an animation frame — `pointermove` can fire well above the refresh rate, and
 * anything more than one write per frame is thrown away by the compositor
 * anyway.
 *
 * The hole eases toward the cursor instead of being pinned to it: a light this
 * large snapping to the pointer looks like a bug, while a light that lags very
 * slightly reads as a physical thing being carried.
 */

/** Fraction of the remaining distance the light covers per frame, at 60fps. */
const EASE = 0.16;
/** Below this the light has arrived and the loop parks itself. */
const SETTLED = 0.4;

const CSS = `
  [data-surprise="spotlight"] {
    --spot-x: 50%;
    --spot-y: 45%;
    background: radial-gradient(
      circle 26vmax at var(--spot-x) var(--spot-y),
      transparent 0%,
      transparent 42%,
      rgba(6, 6, 10, 0.5) 78%,
      rgba(6, 6, 10, 0.62) 100%
    );
  }
`;

export const spotlight: SurpriseEffect = {
  id: "spotlight",
  label: "Someone turned the lights off",
  channel: "cursor",
  animated: true,
  loud: true,
  // Two different ways of darkening the same corners cancel each other out.
  conflicts: ["vignette"],

  start() {
    const removeStyle = injectStyle("spotlight", CSS);
    const layer = mountLayer("spotlight", 45);
    fadeIn(layer, 1, 800);

    // Both start mid-screen so the light is already somewhere sensible before
    // the pointer has moved — and on a touch screen, where it never will.
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.45;
    let targetX = x;
    let targetY = y;
    let frame = 0;

    const step = () => {
      const dx = targetX - x;
      const dy = targetY - y;

      if (Math.abs(dx) < SETTLED && Math.abs(dy) < SETTLED) {
        x = targetX;
        y = targetY;
        frame = 0;
      } else {
        x += dx * EASE;
        y += dy * EASE;
        frame = requestAnimationFrame(step);
      }

      layer.style.setProperty("--spot-x", `${x.toFixed(1)}px`);
      layer.style.setProperty("--spot-y", `${y.toFixed(1)}px`);
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      layer.remove();
      removeStyle();
    };
  },
};
