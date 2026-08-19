import { HEADINGS, injectStyle, type SurpriseEffect } from "../effect";

/**
 * Wires the headings up as neon tube.
 *
 * Three stacked text shadows do the whole job: a tight near-white one for the
 * hot core of the glass, a mid one in the section's own `--tone`, and a wide
 * faint one for the light spilling onto the wall behind. Real neon is bright in
 * the middle and coloured at the edges, and reversing that order is what makes
 * most CSS glows look like a blur filter instead.
 *
 * Every radius is in `em`, so the glow scales with the type rather than
 * swamping small headings and vanishing on large ones.
 *
 * Deliberately not animated. A flicker is the obvious next idea and the wrong
 * one — it draws the eye back to the same word every few seconds, and this has
 * to sit under a page someone is trying to read.
 */

export const neonInk: SurpriseEffect = {
  id: "neon-ink",
  label: "Neon signage",
  channel: "ink",

  start() {
    return injectStyle(
      "neon-ink",
      `
        ${HEADINGS} {
          color: var(--tone);
          text-shadow:
            0 0 0.04em rgba(255, 255, 255, 0.85),
            0 0 0.28em var(--tone),
            0 0 0.85em var(--tone);
          transition: color 600ms ease, text-shadow 600ms ease;
        }

        html .label-mono {
          color: var(--tone);
          text-shadow: 0 0 0.7em var(--tone);
        }

        /*
         * On a light background the wide shadow has nothing dark to bloom into,
         * so it muddies the letter instead. Pulled in and dimmed there.
         */
        html:not(.dark) h1,
        html:not(.dark) h2,
        html:not(.dark) h3,
        html:not(.dark) .text-display,
        html:not(.dark) .text-section {
          text-shadow:
            0 0 0.02em rgba(255, 255, 255, 0.6),
            0 0 0.16em var(--tone),
            0 0 0.42em var(--tone);
        }
      `,
    );
  },
};
