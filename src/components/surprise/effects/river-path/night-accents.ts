import { between } from "../../effect";
import type { RiverLayer } from "./layer";
import { RIVER_CREAM } from "./palette";

const STARS = 30;

/**
 * Stars over the sky band, fading in as scroll reaches "night".
 *
 * Kept as its own small, original layer rather than reusing `starfield.ts` —
 * that effect has its own lifecycle and channel; entangling the two would
 * couple river-path to a module it does not own.
 */
const CSS = `
  @keyframes surprise-river-twinkle {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }

  [data-surprise="river-path"] .rp-night {
    position: absolute;
    inset: 0 0 45% 0;
    opacity: var(--t, 0);
    transition: opacity 0.2s linear;
  }

  [data-surprise="river-path"] .rp-star {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: ${RIVER_CREAM};
    animation: surprise-river-twinkle var(--dur) ease-in-out infinite;
  }
`;

export const nightAccents: RiverLayer = {
  css: CSS,
  mount(root) {
    const layer = document.createElement("div");
    layer.className = "rp-night";

    for (let i = 0; i < STARS; i += 1) {
      const star = document.createElement("i");
      star.className = "rp-star";
      star.style.cssText = [
        `left:${between(0, 100).toFixed(2)}%`,
        `top:${between(0, 90).toFixed(2)}%`,
        `--dur:${between(1.6, 4).toFixed(2)}s`,
        `animation-delay:${(-between(0, 4)).toFixed(2)}s`,
      ].join(";");
      layer.append(star);
    }

    root.append(layer);
  },
};
