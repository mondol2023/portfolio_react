import { between, fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Fills the page with rising soap bubbles.
 *
 * A bubble is not a filled circle — it is a ring with a thin bright rim, a
 * specular highlight up and to the left, and almost nothing in the middle. That
 * is all done with one `radial-gradient` plus an `inset` box-shadow, so a bubble
 * is a single painted element with no children.
 *
 * They rise rather than fall, and they *accelerate* slightly (`ease-in` on the
 * rise) because a real bubble speeds up as it leaves the water. They also
 * wobble on a period unrelated to the rise, which keeps a column of bubbles
 * from travelling as a line.
 *
 * The larger ones are given longer rise times than the small ones — bigger
 * bubbles are actually faster in physics, but slower reads as *heavier* here,
 * and the illusion of depth is worth more than the accuracy.
 */

const BUBBLES = 26;

const CSS = `
  @keyframes surprise-bubble-rise {
    from { transform: translate3d(0, 12vh, 0); opacity: 0; }
    8%   { opacity: 1; }
    88%  { opacity: 1; }
    to   { transform: translate3d(0, -112vh, 0); opacity: 0; }
  }
  @keyframes surprise-bubble-wobble {
    from { transform: translate3d(calc(var(--wobble) * -1), 0, 0) scale(0.97); }
    to   { transform: translate3d(var(--wobble), 0, 0) scale(1.03); }
  }

  [data-surprise="bubbles"] i {
    position: absolute;
    bottom: 0;
    display: block;
    animation: surprise-bubble-rise var(--rise) ease-in var(--offset) infinite;
    will-change: transform, opacity;
  }

  [data-surprise="bubbles"] i > span {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background:
      radial-gradient(circle at 30% 26%, rgba(255,255,255,0.95) 0 6%, transparent 22%),
      radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 58%, rgba(190, 226, 255, 0.32) 82%, rgba(255,255,255,0.55) 94%, transparent 100%);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.28);
    animation: surprise-bubble-wobble var(--wobbleTime) ease-in-out infinite alternate;
  }
`;

export const bubbles: SurpriseEffect = {
  id: "bubbles",
  label: "Bubbles, apparently",
  channel: "weather",
  animated: true,

  start() {
    const removeStyle = injectStyle("bubbles", CSS);
    const layer = mountLayer("bubbles", LAYER.weather);

    for (let i = 0; i < BUBBLES; i += 1) {
      const size = between(10, 62);
      // Bigger bubbles take longer, so size and speed together read as depth.
      const rise = between(9, 15) * (0.7 + size / 90);

      const bubble = document.createElement("i");
      bubble.style.cssText = [
        `left:${between(-2, 98).toFixed(2)}%`,
        `width:${size.toFixed(1)}px`,
        `height:${size.toFixed(1)}px`,
        `opacity:${between(0.45, 0.85).toFixed(2)}`,
        `--rise:${rise.toFixed(2)}s`,
        `--offset:${(-Math.random() * rise).toFixed(2)}s`,
        `--wobble:${between(4, 18).toFixed(0)}px`,
        `--wobbleTime:${between(1.8, 4.6).toFixed(2)}s`,
      ].join(";");

      bubble.append(document.createElement("span"));
      layer.append(bubble);
    }

    fadeIn(layer, 1, 900);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
