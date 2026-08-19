import { between, fadeIn, injectStyle, mountLayer, randomOf, type SurpriseEffect } from "../effect";

/**
 * Weather. Paper falls across the page and keeps falling.
 *
 * Two nested elements per piece, because one cannot do both jobs: the outer one
 * falls and drifts, the inner one tumbles on its own axis at its own rate. A
 * single element animating both would have to combine them in one `transform`
 * keyframe list, and the tumble would be locked to the fall.
 *
 * Every piece starts with a *negative* animation delay, which begins its
 * animation already part-way through. Without it the first pass is a row of
 * paper crossing the screen in formation, and the effect only starts looking
 * like weather a full cycle later.
 *
 * Marked `animated`, so the surprise button skips it under
 * `prefers-reduced-motion` rather than showing a still frame of litter.
 */

const PIECES = 34;

/** Paper, not neon: these are lifted from the site's own accent range. */
const COLORS = ["#fb923c", "#f472b6", "#38bdf8", "#a78bfa", "#4ade80", "#fbbf24", "#fb7185"] as const;

const KEYFRAMES = `
  @keyframes surprise-confetti-fall {
    0%   { transform: translate3d(0, -14vh, 0); opacity: 0; }
    6%   { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translate3d(var(--drift), 112vh, 0); opacity: 0; }
  }
  @keyframes surprise-confetti-tumble {
    from { transform: rotate3d(1, 1, 0.3, 0deg); }
    to   { transform: rotate3d(1, 1, 0.3, 360deg); }
  }
`;

export const confettiRain: SurpriseEffect = {
  id: "confetti-rain",
  label: "It started raining paper",
  channel: "weather",
  animated: true,

  start() {
    const removeStyle = injectStyle(
      "confetti-rain",
      `
        ${KEYFRAMES}
        [data-surprise="confetti-rain"] i {
          position: absolute;
          top: 0;
          display: block;
          animation: surprise-confetti-fall var(--fall) linear var(--offset) infinite;
          will-change: transform;
        }
        [data-surprise="confetti-rain"] i > span {
          display: block;
          width: 100%;
          height: 100%;
          animation: surprise-confetti-tumble var(--tumble) linear infinite;
        }
      `,
    );

    const layer = mountLayer("confetti-rain", 45);

    for (let i = 0; i < PIECES; i += 1) {
      const width = between(6, 13);
      const fall = between(9, 17);

      const piece = document.createElement("i");
      piece.style.cssText = [
        `left:${between(-2, 100).toFixed(2)}%`,
        `width:${width.toFixed(1)}px`,
        // Half of them are ribbons rather than chips.
        `height:${(width * between(0.6, 1.9)).toFixed(1)}px`,
        `--drift:${between(-16, 16).toFixed(1)}vw`,
        `--fall:${fall.toFixed(2)}s`,
        // Negative: start each piece somewhere in the middle of its own fall.
        `--offset:${(-Math.random() * fall).toFixed(2)}s`,
        `--tumble:${between(0.9, 3.2).toFixed(2)}s`,
      ].join(";");

      const face = document.createElement("span");
      face.style.background = randomOf(COLORS);
      face.style.borderRadius = Math.random() < 0.45 ? "9999px" : "1px";
      face.style.boxShadow = "0 1px 3px rgba(0,0,0,0.18)";

      piece.append(face);
      layer.append(piece);
    }

    fadeIn(layer, 1, 700);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
