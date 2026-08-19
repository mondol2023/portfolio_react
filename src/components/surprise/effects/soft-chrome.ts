import { injectStyle, type SurpriseEffect } from "../effect";

/**
 * Rounds every corner on the page off and puts it on a cushion.
 *
 * Radius is applied through one attribute selector — anything already carrying
 * a `rounded-*` utility — rather than to a list of components. The site has no
 * single card class, so a list would go stale the moment a new panel is built,
 * while "already has a corner radius" is the durable description of what should
 * get a rounder one.
 *
 * `rounded-full` is excluded. Those are pills and avatars, and they are already
 * as round as they go; enlarging their radius does nothing, and being included
 * in the transition would make them twitch for no reason.
 *
 * Both radius and shadow transition, so the page settles into the new shape
 * rather than snapping — which matters here more than in most of these, because
 * the change touches almost every box at once.
 */

/** Anything with a corner radius, except the things that are already circles. */
const BOXES = 'html [class*="rounded-"]:not([class*="rounded-full"])';

export const softChrome: SurpriseEffect = {
  id: "soft-chrome",
  label: "Everything went soft",
  channel: "chrome",

  start() {
    return injectStyle(
      "soft-chrome",
      `
        ${BOXES},
        html button:not([class*="rounded-full"]),
        html input,
        html textarea,
        html select {
          border-radius: 1.5rem;
          transition: border-radius 550ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 550ms ease;
        }

        /* Deep, wide and very soft — the shadow of something resting on felt. */
        ${BOXES} {
          box-shadow: 0 18px 40px -22px rgba(20, 16, 14, 0.35);
        }

        html.dark ${BOXES.replace("html ", "")} {
          box-shadow: 0 18px 44px -20px rgba(0, 0, 0, 0.75);
        }

        html img,
        html video {
          border-radius: 1.25rem;
        }
      `,
    );
  },
};
