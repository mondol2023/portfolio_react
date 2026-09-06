import { fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../../effect";
import { boats } from "./boats";
import type { RiverLayer } from "./layer";
import { nightAccents } from "./night-accents";
import { paddyField } from "./paddy-field";
import { observeScrollProgress } from "./scroll-progress";
import { skyWater } from "./sky-water";
import { skyline } from "./skyline";

/**
 * Facade: composes the river-path layers into one `SurpriseEffect`.
 *
 * Each layer only knows how to draw and mount itself; this file is the only
 * one that knows the *set* of layers, their stacking order, and how they tie
 * to scroll — `--t` is set once, here, on the shared root, and every layer's
 * CSS reads it independently (Open/Closed: add a layer without touching the
 * others).
 */
const LAYERS: readonly RiverLayer[] = [skyWater, skyline, paddyField, boats, nightAccents];

export const riverPath: SurpriseEffect = {
  id: "river-path",
  label: "A river ran the length of the page",
  channel: "backdrop",
  animated: true,

  start() {
    const removeStyle = injectStyle("river-path", LAYERS.map((layer) => layer.css).join("\n"));
    const root = mountLayer("river-path", LAYER.backdrop);

    for (const layer of LAYERS) layer.mount(root);

    const stopScroll = observeScrollProgress((t) => {
      root.style.setProperty("--t", t.toFixed(4));
    });

    fadeIn(root, 1, 1200);

    return () => {
      stopScroll();
      root.remove();
      removeStyle();
    };
  },
};
