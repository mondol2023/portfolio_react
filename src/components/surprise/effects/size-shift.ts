import { injectStyle, randomOf, type SurpriseEffect } from "../effect";

/**
 * Rescales the page's type without touching its layout.
 *
 * The site sets its display sizes with fluid `clamp()` ramps in `globals.css`
 * (`.text-display`, `.text-section`, `.text-lead`). CSS cannot multiply a value
 * it cannot read, so this re-declares those three ramps with every term
 * multiplied — the *shape* of each ramp is preserved, which is why a 1.4x page
 * still behaves correctly between a phone and a desktop instead of collapsing
 * to one fixed size.
 *
 * Only type scales. Nothing here changes padding, widths or the grid, so a
 * heading grows into the space it already had and re-wraps; the page cannot
 * break, at worst a long title takes an extra line.
 *
 * Body copy is deliberately dragged along at a fraction of the heading's
 * change. A page whose headlines are half again as large but whose paragraphs
 * are untouched looks like a mistake; moving both, by different amounts, looks
 * like a decision.
 */

/** Heading multipliers. 1.0 is missing on purpose — a surprise that does nothing is not one. */
const SCALES = [0.68, 0.78, 0.88, 1.18, 1.32, 1.5] as const;

/** How much of the heading's change body copy takes on. */
const BODY_SHARE = 0.4;

export const sizeShift: SurpriseEffect = {
  id: "size-shift",
  label: "The type changed size",
  channel: "scale",

  start() {
    const k = randomOf(SCALES);
    const body = 1 + (k - 1) * BODY_SHARE;

    const h = k.toFixed(3);
    const b = body.toFixed(3);

    return injectStyle(
      "size-shift",
      `
        html .text-display,
        html .text-section,
        html .text-lead,
        html .label-mono {
          transition: font-size 700ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        html .text-display {
          font-size: clamp(calc(2.75rem * ${h}), calc(8.5vw * ${h}), calc(6.5rem * ${h}));
        }

        html .text-section {
          font-size: clamp(calc(2rem * ${h}), calc(4.5vw * ${h}), calc(3.25rem * ${h}));
        }

        html .text-lead {
          font-size: clamp(calc(1rem * ${b}), calc(1.6vw * ${b}), calc(1.1875rem * ${b}));
        }

        html .label-mono {
          font-size: calc(0.6875rem * ${b});
        }
      `,
    );
  },
};
