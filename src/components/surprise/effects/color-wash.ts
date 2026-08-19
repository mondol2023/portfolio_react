import { between, fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Rotates the colour of the entire page, forever.
 *
 * `mix-blend-mode: hue` is the whole effect, and it is chosen over every other
 * blend mode for one reason: it takes the *hue* of this layer and keeps the
 * saturation and lightness of what is underneath. Contrast is a function of
 * lightness, so no matter what colour rolls past, body copy stays exactly as
 * readable as it was — which is not true of `color`, `multiply`, `screen`, or
 * simply dropping a translucent sheet over the page.
 *
 * The rotation is done with `filter: hue-rotate` on the layer rather than by
 * animating gradient stops. One filter on one element is a single compositor
 * operation; animating four colour stops would re-rasterise a full-viewport
 * gradient every frame.
 *
 * Slow on purpose — a minute or more for a full turn. The page should look
 * subtly different every time you glance back at it, not obviously animated
 * while you are reading.
 */

const CSS = `
  @keyframes surprise-wash-turn {
    to { filter: hue-rotate(360deg); }
  }

  [data-surprise="color-wash"] {
    mix-blend-mode: hue;
    animation: surprise-wash-turn var(--turn) linear infinite;
    will-change: filter;
  }
`;

export const colorWash: SurpriseEffect = {
  id: "color-wash",
  label: "The colour keeps drifting",
  channel: "overlay",
  animated: true,
  loud: true,

  start() {
    const removeStyle = injectStyle("color-wash", CSS);
    const layer = mountLayer("color-wash", LAYER.overlay);

    const base = Math.round(Math.random() * 360);
    const angle = Math.round(between(0, 360));

    /*
     * A gradient rather than a flat colour, so the page is never all one hue at
     * once — the top and bottom of the viewport sit at different points on the
     * wheel and travel together as the filter turns.
     */
    layer.style.background = `linear-gradient(
      ${angle}deg,
      oklch(0.6 0.24 ${base}),
      oklch(0.6 0.24 ${(base + 70) % 360}),
      oklch(0.6 0.24 ${(base + 145) % 360})
    )`;
    layer.style.setProperty("--turn", `${between(48, 90).toFixed(0)}s`);

    fadeIn(layer, 0.72, 1200);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
