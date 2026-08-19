import { between, HEADINGS, injectStyle, randomOf, type SurpriseEffect } from "../effect";

/**
 * Fills the headings with a gradient that keeps moving through them.
 *
 * `background-clip: text` with a transparent fill paints the letterforms with
 * whatever is behind them, and the background is twice as wide as the box — so
 * translating its position slides colour through the words without anything
 * about the text itself changing.
 *
 * The gradient is built from one random base hue and two offsets rather than
 * three independent colours. Three random hues will eventually land on a set
 * that fights; a base plus offsets is a scheme by construction, the same
 * reasoning `tone-shuffle` uses. Lightness stays in the band that stays legible
 * on either theme's background, because the letters *are* the gradient here —
 * a dark stop on a dark page is not a dull heading, it is a missing one.
 */

/** How far apart the three stops sit on the wheel. */
const SPREADS = [26, 48, 74, 118] as const;

const SLIDE_S = 9;

export const gradientInk: SurpriseEffect = {
  id: "gradient-ink",
  label: "The headings caught a gradient",
  channel: "ink",
  animated: true,

  start() {
    const base = Math.random() * 360;
    const spread = randomOf(SPREADS);
    const angle = between(88, 112).toFixed(0);

    const at = (index: number, l: number, c: number) =>
      `oklch(${l} ${c} ${(((base + index * spread) % 360) + 360) % 360})`;

    // Light theme leans darker, dark theme lighter; the stops are the text.
    const lightStops = [at(0, 0.58, 0.19), at(1, 0.5, 0.21), at(2, 0.62, 0.18), at(0, 0.58, 0.19)];
    const darkStops = [at(0, 0.84, 0.15), at(1, 0.78, 0.17), at(2, 0.88, 0.13), at(0, 0.84, 0.15)];

    const paint = (stops: string[]) => `
      background-image: linear-gradient(${angle}deg, ${stops.join(", ")});
      background-size: 220% 100%;
      background-position: 0% 50%;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      -webkit-text-fill-color: transparent;
    `;

    return injectStyle(
      "gradient-ink",
      `
        @keyframes surprise-ink-slide {
          to { background-position: 220% 50%; }
        }

        ${HEADINGS} {
          ${paint(lightStops)}
          animation: surprise-ink-slide ${SLIDE_S}s linear infinite;
        }

        html.dark h1,
        html.dark h2,
        html.dark h3,
        html.dark .text-display,
        html.dark .text-section {
          ${paint(darkStops)}
        }
      `,
    );
  },
};
