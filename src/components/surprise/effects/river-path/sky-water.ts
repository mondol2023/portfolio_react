import type { RiverLayer } from "./layer";
import { SKY_STOPS, WATER_STOPS } from "./palette";

/**
 * Sky + water band, panning through the day cycle as the page scrolls.
 *
 * Both gradients stack dawn→day→dusk→night in one oversized image and pan by
 * `background-position` — the trick `grid-warp.ts` uses for motion, but driven
 * by `--t` (scroll fraction) instead of a looping animation, so position tracks
 * scroll exactly rather than cycling on a timer.
 */
function band(stops: Record<"dawn" | "day" | "dusk" | "night", string>): string {
  return `linear-gradient(
    to bottom,
    ${stops.dawn} 0%, ${stops.dawn} 25%,
    ${stops.day} 25%, ${stops.day} 50%,
    ${stops.dusk} 50%, ${stops.dusk} 75%,
    ${stops.night} 75%, ${stops.night} 100%
  )`;
}

const CSS = `
  @keyframes surprise-river-shimmer {
    from { background-position: 0 0; }
    to   { background-position: -340% 0; }
  }

  [data-surprise="river-path"] .rp-sky {
    position: absolute;
    inset: 0 0 45% 0;
    background-image: ${band(SKY_STOPS)};
    background-size: 100% 400%;
    background-position: 0 calc(var(--t, 0) * 100%);
  }

  [data-surprise="river-path"] .rp-water {
    position: absolute;
    inset: 55% 0 0 0;
    background-image: ${band(WATER_STOPS)};
    background-size: 100% 400%;
    background-position: 0 calc(var(--t, 0) * 100%);
  }

  [data-surprise="river-path"] .rp-shimmer {
    position: absolute;
    inset: 55% 0 0 0;
    background-image: repeating-linear-gradient(
      100deg,
      transparent 0 40px,
      oklch(1 0 0 / 0.08) 40px 42px
    );
    background-size: 340% 100%;
    animation: surprise-river-shimmer 9s linear infinite;
    mix-blend-mode: overlay;
  }
`;

export const skyWater: RiverLayer = {
  css: CSS,
  mount(root) {
    const sky = document.createElement("div");
    sky.className = "rp-sky";

    const water = document.createElement("div");
    water.className = "rp-water";

    const shimmer = document.createElement("div");
    shimmer.className = "rp-shimmer";

    root.append(sky, water, shimmer);
  },
};
