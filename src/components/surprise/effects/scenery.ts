import { fadeIn, injectStyle, mountLayer, randomOf, type SurpriseEffect } from "../effect";

/**
 * Puts the page somewhere else.
 *
 * One `fixed` layer at `z-index: -8`, which is the useful gap in the stack: the
 * root background paints first, then negative-z layers, then everything in
 * normal flow. So the scene sits *over* the site's own ambient backdrop
 * (`z-index: -10`) and *under* every word on the page — no text is ever
 * obscured, and nothing in the document has to know this happened.
 *
 * Each scene is one `background` shorthand plus one slow transform loop. Every
 * colour is translucent, and the whole layer is faded in under its own target
 * opacity, so the page's real background still shows through and body copy
 * keeps its contrast in both themes. That constraint is why these are washes of
 * light rather than illustrations — an opaque scene would win a fight with the
 * text it sits behind.
 */

interface Scene {
  id: string;
  /** Kept below 1: the scene tints the page, it does not replace it. */
  opacity: number;
  css: string;
}

const SCENES: readonly [Scene, ...Scene[]] = [
  {
    id: "aurora",
    opacity: 0.85,
    css: `
      background:
        radial-gradient(70% 55% at 18% 8%, oklch(0.72 0.19 165 / 0.42), transparent 70%),
        radial-gradient(62% 48% at 82% 18%, oklch(0.66 0.21 305 / 0.38), transparent 70%),
        radial-gradient(85% 62% at 50% 102%, oklch(0.62 0.17 245 / 0.34), transparent 72%);
      animation: surprise-scene-drift 22s ease-in-out infinite alternate;
    `,
  },
  {
    id: "dusk",
    opacity: 0.8,
    css: `
      background:
        radial-gradient(circle at 50% 74%, oklch(0.92 0.14 78 / 0.85) 0 7vmin, transparent 7.3vmin),
        radial-gradient(45% 30% at 50% 74%, oklch(0.85 0.16 62 / 0.45), transparent 72%),
        linear-gradient(
          to bottom,
          oklch(0.42 0.14 288 / 0.5) 0%,
          oklch(0.6 0.18 22 / 0.42) 58%,
          oklch(0.78 0.15 68 / 0.38) 100%
        );
      animation: surprise-scene-breathe 26s ease-in-out infinite alternate;
    `,
  },
  {
    id: "deep",
    opacity: 0.78,
    css: `
      background:
        radial-gradient(120% 60% at 50% -10%, oklch(0.78 0.13 215 / 0.4), transparent 68%),
        radial-gradient(70% 55% at 22% 78%, oklch(0.48 0.14 235 / 0.42), transparent 72%),
        linear-gradient(to bottom, oklch(0.55 0.12 225 / 0.28), oklch(0.28 0.1 250 / 0.52));
      animation: surprise-scene-drift 30s ease-in-out infinite alternate;
    `,
  },
  {
    id: "blueprint",
    opacity: 0.7,
    css: `
      background:
        radial-gradient(90% 70% at 50% 0%, oklch(0.7 0.16 200 / 0.24), transparent 72%),
        repeating-linear-gradient(to right, oklch(0.7 0.16 200 / 0.22) 0 1px, transparent 1px 72px),
        repeating-linear-gradient(to bottom, oklch(0.7 0.16 200 / 0.22) 0 1px, transparent 1px 72px),
        linear-gradient(to bottom, oklch(0.5 0.13 245 / 0.2), oklch(0.4 0.12 250 / 0.34));
      animation: surprise-scene-pan 40s linear infinite;
    `,
  },
  {
    id: "ember",
    opacity: 0.72,
    css: `
      background:
        radial-gradient(60% 50% at 78% 88%, oklch(0.68 0.2 38 / 0.45), transparent 70%),
        radial-gradient(55% 45% at 18% 92%, oklch(0.6 0.21 22 / 0.4), transparent 70%),
        radial-gradient(100% 70% at 50% 110%, oklch(0.82 0.16 72 / 0.3), transparent 68%);
      animation: surprise-scene-breathe 18s ease-in-out infinite alternate;
    `,
  },
];

/**
 * Three loops, shared by all the scenes. `transform` and nothing else — these
 * run for as long as the scene is up, and a background-position or filter
 * animation on a full-viewport element would repaint it every frame.
 */
const KEYFRAMES = `
  @keyframes surprise-scene-drift {
    from { transform: translate3d(-3%, -2%, 0) scale(1.08); }
    to   { transform: translate3d(3%, 2%, 0) scale(1.18); }
  }
  @keyframes surprise-scene-breathe {
    from { transform: scale(1.04); }
    to   { transform: scale(1.16) translate3d(0, -2%, 0); }
  }
  @keyframes surprise-scene-pan {
    from { transform: translate3d(0, 0, 0) scale(1.1); }
    to   { transform: translate3d(-72px, -72px, 0) scale(1.1); }
  }
`;

export const scenery: SurpriseEffect = {
  id: "scenery",
  label: "The scenery changed",
  channel: "backdrop",

  start() {
    const scene = randomOf(SCENES);

    const removeStyle = injectStyle(
      "scenery",
      `
        ${KEYFRAMES}
        [data-surprise="scenery"][data-scene="${scene.id}"] {
          /* Oversized so the drift never exposes an edge of the viewport. */
          inset: -12% !important;
          ${scene.css}
        }
      `,
    );

    const layer = mountLayer("scenery", -8);
    layer.dataset.scene = scene.id;
    fadeIn(layer, scene.opacity, 1200);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
