import { fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Darkens the corners and leaves the middle alone.
 *
 * The quietest thing in the set, and the only one that exists mainly to be
 * combined with something else — it costs one element and one gradient, it
 * never moves, and it makes whatever else is running look more deliberate by
 * pushing attention to the centre of the page.
 *
 * The gradient is elliptical and wider than it is tall, matching the shape of
 * a landscape viewport. A circular vignette on a 16:9 screen darkens the left
 * and right edges far more than the top and bottom, which reads as a mistake.
 *
 * Not animated, so it survives `prefers-reduced-motion` and is available in the
 * pool when the moving effects are not.
 */

const CSS = `
  [data-surprise="vignette"] {
    background: radial-gradient(
      124% 96% at 50% 46%,
      transparent 38%,
      rgba(8, 6, 5, 0.16) 68%,
      rgba(8, 6, 5, 0.46) 88%,
      rgba(8, 6, 5, 0.62) 100%
    );
  }

  /* A near-black page needs less of it, or the corners just disappear. */
  html.dark [data-surprise="vignette"] {
    background: radial-gradient(
      124% 96% at 50% 46%,
      transparent 34%,
      rgba(0, 0, 0, 0.2) 66%,
      rgba(0, 0, 0, 0.52) 90%,
      rgba(0, 0, 0, 0.7) 100%
    );
  }
`;

export const vignette: SurpriseEffect = {
  id: "vignette",
  label: "The edges went dark",
  channel: "overlay",

  start() {
    const removeStyle = injectStyle("vignette", CSS);
    const layer = mountLayer("vignette", LAYER.overlay);

    fadeIn(layer, 1, 1000);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
