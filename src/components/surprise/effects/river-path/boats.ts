import { between } from "../../effect";
import type { RiverLayer } from "./layer";
import { RIVER_INK } from "./palette";

const BOATS = 4;

/**
 * Nouka boat silhouettes drifting on the water band.
 *
 * `depth` (0–1) does triple duty as size, opacity, and speed — one random
 * value instead of three, which is what actually reads as parallax: nearer
 * boats are bigger, bolder, and faster, all from the same number.
 */
const CSS = `
  @keyframes surprise-river-drift {
    from { transform: translate3d(-10vw, 0, 0); }
    to   { transform: translate3d(110vw, 0, 0); }
  }

  [data-surprise="river-path"] .rp-boat {
    position: absolute;
    height: 1.2vmin;
    border-radius: 50% 50% 40% 40% / 100% 100% 20% 20%;
    background: ${RIVER_INK};
    animation: surprise-river-drift linear infinite;
  }

  [data-surprise="river-path"] .rp-boat::after {
    content: "";
    position: absolute;
    left: 46%;
    bottom: 100%;
    width: 1px;
    height: 220%;
    background: ${RIVER_INK};
  }
`;

export const boats: RiverLayer = {
  css: CSS,
  mount(root) {
    for (let i = 0; i < BOATS; i += 1) {
      const depth = between(0.4, 1);

      const boat = document.createElement("div");
      boat.className = "rp-boat";
      boat.style.cssText = [
        `top:${between(58, 92).toFixed(1)}%`,
        `width:${(4 * depth).toFixed(1)}vmin`,
        `opacity:${(0.35 + depth * 0.5).toFixed(2)}`,
        `animation-duration:${(60 / depth).toFixed(1)}s`,
        `animation-delay:${(-between(0, 40)).toFixed(2)}s`,
      ].join(";");
      root.append(boat);
    }
  },
};
