import { injectStyle, type SurpriseEffect } from "../effect";

/**
 * Gives every panel a thick outline and a hard offset shadow.
 *
 * The shadow has no blur and no transparency — it is a solid block of colour
 * offset down and right, which is what separates this from a normal drop
 * shadow. A blurred shadow says "this is floating above the page"; a hard one
 * says "this is a sticker lying on it".
 *
 * The shadow colour is `var(--tone)`, so panels pick up the colour identity of
 * whichever section they belong to. That is the detail that keeps this from
 * being a generic neo-brutalist skin — the page's own structure shows through
 * the treatment instead of being covered by it.
 *
 * Interactive elements get a press: hover slides the box into its own shadow
 * and shrinks the offset by the same amount, so the element appears to be
 * pushed down toward the page rather than merely translated.
 */

const BOXES = 'html [class*="rounded-"]:not([class*="rounded-full"])';

export const stickerChrome: SurpriseEffect = {
  id: "sticker-chrome",
  label: "Sticker book",
  channel: "chrome",

  start() {
    return injectStyle(
      "sticker-chrome",
      `
        ${BOXES} {
          border-radius: 0.75rem;
          border-width: 2px;
          border-style: solid;
          border-color: var(--fg);
          box-shadow: 5px 5px 0 0 var(--tone);
          transition:
            border-radius 400ms ease,
            box-shadow 220ms ease,
            transform 220ms ease;
        }

        html button:not([class*="rounded-full"]) {
          border-radius: 0.75rem;
          border-width: 2px;
          border-style: solid;
          border-color: var(--fg);
          box-shadow: 4px 4px 0 0 var(--tone);
          transition: box-shadow 160ms ease, transform 160ms ease;
        }

        /* Pressed into the page: move by the offset, lose the same offset. */
        html button:not([class*="rounded-full"]):hover {
          transform: translate3d(2px, 2px, 0);
          box-shadow: 2px 2px 0 0 var(--tone);
        }

        html button:not([class*="rounded-full"]):active {
          transform: translate3d(4px, 4px, 0);
          box-shadow: 0 0 0 0 var(--tone);
        }
      `,
    );
  },
};
