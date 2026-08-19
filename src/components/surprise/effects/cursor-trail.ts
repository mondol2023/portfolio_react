import { between, injectStyle, LAYER, mountLayer, randomOf, type SurpriseEffect } from "../effect";

/**
 * Hangs a tail of dots off the pointer.
 *
 * Each dot chases the one in front of it by a fixed fraction of the remaining
 * distance, every frame. That single rule produces the whole behaviour: the
 * chain stretches out when the pointer moves fast, gathers into a cluster when
 * it stops, and whips around corners — none of which has to be written down,
 * because it all falls out of a lag applied repeatedly down a line.
 *
 * The dots shrink and fade along the tail, so it reads as one object with a
 * direction rather than as a row of circles.
 *
 * The loop parks itself when everything has caught up and is woken by the next
 * `pointermove`, so a stationary pointer costs nothing. Positions are written
 * as `transform`, never as `left`/`top`: the former is composited, the latter
 * would lay out sixteen elements per frame.
 */

const DOTS = 16;
/** Fraction of the gap each dot closes per frame. Lower is a longer, lazier tail. */
const CHASE = 0.34;
/** Below this everything has arrived and the loop stops. */
const SETTLED = 0.2;

const CSS = `
  [data-surprise="cursor-trail"] i {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    border-radius: 50%;
    /* Centred on its own point, so the head sits under the cursor, not beside it. */
    margin: calc(var(--d) / -2) 0 0 calc(var(--d) / -2);
    width: var(--d);
    height: var(--d);
    background: radial-gradient(circle at 34% 32%, #fff 0 18%, var(--hue) 60%, transparent 78%);
    box-shadow: 0 0 10px 1px var(--hue);
    will-change: transform;
  }
`;

/** Warm, cool, and one that just looks like a spark. */
const HUES = ["#fb923c", "#38bdf8", "#f472b6", "#4ade80", "#a78bfa", "#fde68a"] as const;

export const cursorTrail: SurpriseEffect = {
  id: "cursor-trail",
  label: "Something is following the cursor",
  channel: "cursor",
  animated: true,

  start() {
    const removeStyle = injectStyle("cursor-trail", CSS);
    const layer = mountLayer("cursor-trail", LAYER.cursor);

    const hue = randomOf(HUES);
    const dots: HTMLElement[] = [];
    const xs: number[] = [];
    const ys: number[] = [];

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.45;

    for (let i = 0; i < DOTS; i += 1) {
      const t = i / (DOTS - 1);
      const dot = document.createElement("i");

      dot.style.cssText = [
        `--d:${(between(15, 19) * (1 - t * 0.82)).toFixed(1)}px`,
        `--hue:${hue}`,
        `opacity:${(0.85 * (1 - t * 0.78)).toFixed(2)}`,
      ].join(";");

      layer.append(dot);
      dots.push(dot);
      xs.push(targetX);
      ys.push(targetY);
    }

    let frame = 0;

    const step = () => {
      let moving = false;

      for (let i = 0; i < DOTS; i += 1) {
        // The head chases the pointer; every other dot chases the one before it.
        const toX = i === 0 ? targetX : (xs[i - 1] as number);
        const toY = i === 0 ? targetY : (ys[i - 1] as number);

        const dx = toX - (xs[i] as number);
        const dy = toY - (ys[i] as number);

        if (Math.abs(dx) > SETTLED || Math.abs(dy) > SETTLED) moving = true;

        xs[i] = (xs[i] as number) + dx * CHASE;
        ys[i] = (ys[i] as number) + dy * CHASE;

        const dot = dots[i];
        if (dot) {
          dot.style.transform = `translate3d(${(xs[i] as number).toFixed(1)}px, ${(ys[i] as number).toFixed(1)}px, 0)`;
        }
      }

      frame = moving ? requestAnimationFrame(step) : 0;
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!frame) frame = requestAnimationFrame(step);
    };

    // One pass now, so the chain is stacked at its starting point rather than
    // sitting at the top-left corner until the pointer first moves.
    step();
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      layer.remove();
      removeStyle();
    };
  },
};
