import { between } from "../../effect";
import type { RiverLayer } from "./layer";
import { RIVER_GREEN } from "./palette";

const BLADES = 40;

/**
 * Swaying paddy-stalk foreground.
 *
 * Each blade sways on its own period via a negative `animation-delay`, the
 * desync technique `fireflies.ts` uses — a shared clock would read as one
 * plant, not a field. Fades toward night, with a floor so the band never
 * disappears completely.
 */
const CSS = `
  @keyframes surprise-river-sway {
    from { transform: rotate(calc(var(--lean) * -1)); }
    to   { transform: rotate(var(--lean)); }
  }

  [data-surprise="river-path"] .rp-paddy {
    position: absolute;
    inset: auto 0 0 0;
    height: 14%;
    opacity: max(0.15, calc(1 - var(--t, 0)));
    transition: opacity 0.2s linear;
  }

  [data-surprise="river-path"] .rp-blade {
    position: absolute;
    bottom: 0;
    width: 3px;
    background: linear-gradient(to top, ${RIVER_GREEN}, transparent);
    transform-origin: bottom center;
    animation: surprise-river-sway var(--dur) ease-in-out infinite alternate;
  }
`;

export const paddyField: RiverLayer = {
  css: CSS,
  mount(root) {
    const band = document.createElement("div");
    band.className = "rp-paddy";

    for (let i = 0; i < BLADES; i += 1) {
      const blade = document.createElement("i");
      blade.className = "rp-blade";
      blade.style.cssText = [
        `left:${between(0, 100).toFixed(2)}%`,
        `height:${between(60, 100).toFixed(0)}%`,
        `--lean:${between(4, 10).toFixed(1)}deg`,
        `--dur:${between(2.4, 4.2).toFixed(2)}s`,
        `animation-delay:${(-between(0, 4)).toFixed(2)}s`,
      ].join(";");
      band.append(blade);
    }

    root.append(band);
  },
};
