import { injectStyle, type SurpriseEffect } from "../effect";

/**
 * Hollows out the big type.
 *
 * Transparent fill plus `-webkit-text-stroke` leaves the outline of each
 * letterform and nothing inside it. The stroke colour is `var(--tone)`, which
 * inherits per section, so the outlines pick up whatever colour identity that
 * part of the page already has — including whatever `tone-shuffle` or
 * `mono-tint` has just done to it, if one of those is running alongside.
 *
 * Only the two largest ramps are hollowed. An outlined `h3` at 20px is
 * illegible — there is not enough counter left inside the letters — so the
 * smaller headings keep their fill and go on carrying the hierarchy.
 *
 * The stroke width is fluid rather than fixed: a 1px outline disappears on a
 * 100px display heading, and a 2px outline eats a 32px one.
 */

export const outlineInk: SurpriseEffect = {
  id: "outline-ink",
  label: "Hollow headings",
  channel: "ink",

  start() {
    return injectStyle(
      "outline-ink",
      `
        html .text-display,
        html .text-section,
        html h1 {
          color: transparent;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: clamp(1px, 0.09em, 3px) var(--tone);
          /* Stroke under fill, so the outline stays even where glyphs overlap. */
          paint-order: stroke fill;
          transition: -webkit-text-stroke-color 600ms ease;
        }

        /* Anything below the display ramp keeps its fill — see the note above. */
        html h2:not(.text-section),
        html h3 {
          color: var(--tone);
        }
      `,
    );
  },
};
