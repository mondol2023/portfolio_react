import type { RiverLayer } from "./layer";
import { RIVER_GOLD, RIVER_INK, RIVER_TERRACOTTA } from "./palette";

/**
 * Sundarbans treeline settling into a low Dhaka skyline — mangrove crowns on
 * the left, blocky rooftops and mosque domes on the right — cut from one
 * silhouette shape so there is a single flat ink cutout instead of a stack of
 * separately positioned pieces. A dawn/night glow sits behind it and
 * crossfades on `--t`.
 */
const SILHOUETTE = `polygon(
  0% 100%, 0% 55%, 4% 48%, 8% 58%, 12% 42%, 16% 54%, 20% 46%, 24% 56%,
  28% 50%, 32% 38%, 34% 50%, 38% 44%, 40% 30%, 42% 44%, 46% 40%,
  48% 20%, 50% 40%, 52% 22%, 54% 40%, 58% 34%, 60% 44%, 64% 30%,
  66% 44%, 70% 38%, 72% 50%, 76% 42%, 80% 52%, 84% 46%, 88% 56%,
  92% 44%, 96% 54%, 100% 48%, 100% 100%
)`;

const CSS = `
  [data-surprise="river-path"] .rp-skyline-glow {
    position: absolute;
    inset: 20% 0 40% 0;
    background: radial-gradient(60% 100% at 50% 100%, ${RIVER_GOLD}, transparent 70%);
    opacity: calc(1 - var(--t, 0));
    transition: opacity 0.2s linear;
  }

  [data-surprise="river-path"] .rp-skyline {
    position: absolute;
    inset: 22% 0 44% 0;
    background: linear-gradient(to bottom, ${RIVER_INK}, ${RIVER_INK} 70%, ${RIVER_TERRACOTTA} 100%);
    clip-path: ${SILHOUETTE};
    transform: translate3d(0, calc(var(--t, 0) * -1.5%), 0);
  }
`;

export const skyline: RiverLayer = {
  css: CSS,
  mount(root) {
    const glow = document.createElement("div");
    glow.className = "rp-skyline-glow";

    const silhouette = document.createElement("div");
    silhouette.className = "rp-skyline";

    root.append(glow, silhouette);
  },
};
