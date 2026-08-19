import { fadeIn, injectStyle, LAYER, mountLayer, randomOf, type SurpriseEffect } from "../effect";

/**
 * Lays a perspective floor under the page and runs it toward the horizon.
 *
 * The floor is one element with two `repeating-linear-gradient` rules on it,
 * laid flat by `rotateX(76deg)` inside a short `perspective()`. That is the
 * whole geometry — the horizontal lines bunch up toward the vanishing point for
 * free, because perspective does the foreshortening that hand-drawn grid lines
 * have to fake.
 *
 * Only `background-position` animates, and only on the vertical axis. Moving
 * the *element* would slide the whole plane including its vanishing point;
 * moving the pattern inside a fixed plane is what makes it read as travel.
 * Because the tile is 90px and the shift is exactly 90px, the loop is seamless.
 *
 * A glow sits on the horizon line and a haze covers the join, so the floor
 * fades into the page rather than ending at a hard edge halfway down.
 */

interface Scheme {
  line: string;
  glow: string;
}

/** Hue pairs for the floor lines and the horizon glow. */
const SCHEMES: readonly [Scheme, ...Scheme[]] = [
  { line: "oklch(0.72 0.2 330)", glow: "oklch(0.7 0.22 300)" },
  { line: "oklch(0.78 0.17 195)", glow: "oklch(0.72 0.19 240)" },
  { line: "oklch(0.8 0.16 145)", glow: "oklch(0.75 0.18 175)" },
  { line: "oklch(0.76 0.19 55)", glow: "oklch(0.7 0.2 25)" },
];

const CSS = `
  @keyframes surprise-grid-run {
    to { background-position: 0 90px, 0 0; }
  }

  [data-surprise="grid-warp"] {
    perspective: 260px;
    perspective-origin: 50% 0%;
  }

  [data-surprise="grid-warp"] i {
    position: absolute;
    /* Wider than the viewport: perspective splays the near edge outward. */
    inset: 46% -60% -30% -60%;
    display: block;
    transform-origin: 50% 0%;
    transform: rotateX(76deg);
    background-image:
      repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 90px),
      repeating-linear-gradient(to right, var(--line) 0 1px, transparent 1px 90px);
    background-position: 0 0, 0 0;
    animation: surprise-grid-run 2.6s linear infinite;
    will-change: background-position;
  }

  /* Glow on the horizon line itself. */
  [data-surprise="grid-warp"] b {
    position: absolute;
    inset: 30% 0 auto 0;
    height: 26%;
    display: block;
    background: radial-gradient(60% 100% at 50% 100%, var(--glow), transparent 72%);
    opacity: 0.55;
  }

  /* Softens the seam where the floor meets the rest of the page. */
  [data-surprise="grid-warp"] u {
    position: absolute;
    inset: 38% 0 auto 0;
    height: 18%;
    display: block;
    background: linear-gradient(to bottom, transparent, var(--haze));
  }
`;

export const gridWarp: SurpriseEffect = {
  id: "grid-warp",
  label: "A grid ran off to the horizon",
  channel: "backdrop",
  animated: true,

  start() {
    const scheme = randomOf(SCHEMES);

    const removeStyle = injectStyle("grid-warp", CSS);
    const layer = mountLayer("grid-warp", LAYER.backdrop);

    layer.style.setProperty("--line", `color-mix(in oklab, ${scheme.line} 55%, transparent)`);
    layer.style.setProperty("--glow", `color-mix(in oklab, ${scheme.glow} 45%, transparent)`);
    layer.style.setProperty("--haze", `color-mix(in oklab, ${scheme.glow} 12%, transparent)`);

    layer.append(
      document.createElement("u"),
      document.createElement("b"),
      document.createElement("i"),
    );

    fadeIn(layer, 0.85, 1200);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
