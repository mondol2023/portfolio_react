import { injectStyle, type SurpriseEffect } from "../effect";

/**
 * Takes every corner radius off the page.
 *
 * The exact inverse of `soft-chrome`, down to the selector, and the pair is the
 * point: the same structural change in two directions reads as a decision about
 * the page rather than as one random idea.
 *
 * Shadows go too. A hard-edged box with a soft drop shadow is the worst of both
 * — it reads as an unfinished rounded card. What replaces the elevation is a
 * heavier border, so depth is drawn rather than lit.
 *
 * Circular elements are left alone for the same reason as in `soft-chrome`:
 * squaring off an avatar is a change to the content, not to the furniture.
 */

const BOXES = 'html [class*="rounded-"]:not([class*="rounded-full"])';

export const sharpChrome: SurpriseEffect = {
  id: "sharp-chrome",
  label: "Hard edges everywhere",
  channel: "chrome",

  start() {
    return injectStyle(
      "sharp-chrome",
      `
        ${BOXES},
        html button:not([class*="rounded-full"]),
        html input,
        html textarea,
        html select,
        html img,
        html video {
          border-radius: 0;
          transition: border-radius 450ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 450ms ease;
        }

        /* Elevation is drawn, not lit: no shadow, a firmer line instead. */
        ${BOXES} {
          box-shadow: none;
          border-color: var(--border-strong);
        }

        html:focus-visible,
        html *:focus-visible {
          border-radius: 0;
        }
      `,
    );
  },
};
