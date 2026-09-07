import { LAYER, mountLayer, type SurpriseEffect } from "@/components/surprise/effect";

import { createClock } from "./core/clock";
import { createInput } from "./core/input";
import { createWorld, updateWorld } from "./core/world";
import { createWaterRenderer } from "./gl/water-renderer";
import { createSpriteRenderer } from "./sprites/sprite-renderer";

/** How far the scene is pushed back behind the page's own words. */
const SCENE_OPACITY = 0.82;

/**
 * The scrim: the scene is a backdrop, and body copy has to stay readable over
 * it.
 *
 * A photographic full-bleed image behind text is the classic way to make a
 * portfolio unreadable at noon. So the top of the viewport — where headings
 * live — and the bottom both wash back into the page's own `--bg`, and only
 * the middle band, which is horizon and water, comes through at full strength.
 * The mask is on the wrapper rather than either canvas so the two stay in step.
 */
const WRAPPER_CSS = [
  "position:absolute",
  "inset:0",
  "opacity:0",
  "transition:opacity 900ms ease",
  "-webkit-mask-image:linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 14%, #000 34%, #000 72%, transparent 100%)",
  "mask-image:linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 14%, #000 34%, #000 72%, transparent 100%)",
].join(";");

const CANVAS_CSS = ["position:absolute", "inset:0", "width:100%", "height:100%", "display:block"].join(
  ";",
);

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = CANVAS_CSS;
  canvas.setAttribute("aria-hidden", "true");
  return canvas;
}

/**
 * The living river.
 *
 * Two canvases stacked in one layer: a WebGL surface that ray-traces the sky
 * and water per pixel, and a 2D canvas that paints everything with edges — the
 * bank, the boats, the birds, the reeds — into the same projection. They agree
 * because both read one `World`, and because the height field the shader uses
 * is generated from the same table the boats float on.
 *
 * Shaped as a `SurpriseEffect` so it can be started imperatively (`const stop =
 * livingRiver.start()`) and torn down completely, but deliberately kept out of
 * the `SURPRISE_EFFECTS` registry: it has its own admin switch rather than
 * being one entry in the animation list, so it can never be rolled at random
 * on top of the older river scene.
 */
export const livingRiver: SurpriseEffect = {
  id: "living-river",
  label: "A river that notices you",
  channel: "backdrop",
  animated: true,
  loud: true,
  conflicts: ["river-path"],

  start() {
    const layer = mountLayer("living-river", LAYER.backdrop);

    const wrapper = document.createElement("div");
    wrapper.style.cssText = WRAPPER_CSS;

    const waterCanvas = makeCanvas();
    const spriteCanvas = makeCanvas();
    wrapper.append(waterCanvas, spriteCanvas);
    layer.append(wrapper);

    const water = createWaterRenderer(waterCanvas);

    // No WebGL: drop the canvas entirely rather than leaving a dead element in
    // the tree, and tell the sprite layer to paint the sky itself.
    if (!water) waterCanvas.remove();

    const sprites = createSpriteRenderer(spriteCanvas, { fallbackSky: !water });

    const input = createInput();
    const world = createWorld();

    let width = 0;
    let height = 0;

    function measure(scale: number, force = false) {
      // `innerWidth`/`innerHeight` rather than the layer's own box: the layer
      // is `position: fixed; inset: 0`, so they are the same number, and
      // reading them does not force a layout flush every frame.
      const nextWidth = Math.max(1, Math.round(window.innerWidth));
      const nextHeight = Math.max(1, Math.round(window.innerHeight));

      if (!force && nextWidth === width && nextHeight === height) return;

      width = nextWidth;
      height = nextHeight;

      const dpr = window.devicePixelRatio || 1;
      water?.resize(width, height, dpr, scale);
      sprites?.resize(width, height, dpr, scale);
    }

    const clock = createClock({
      frame(dt, scale) {
        measure(scale);
        updateWorld(world, input, dt, width, height);
        water?.render(world);
        sprites?.render(world);
      },
      // The quality guard changed the resolution: both backing stores have to
      // be rebuilt at the new size, and neither will notice on its own because
      // the CSS size has not changed.
      onScaleChange(scale) {
        measure(scale, true);
      },
    });

    // Nothing is visible until the first frame has actually drawn, so the fade
    // is armed here and starts when the layer already has a river in it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.opacity = String(SCENE_OPACITY);
      });
    });

    return () => {
      clock.stop();
      input.dispose();
      water?.dispose();
      sprites?.dispose();
      layer.remove();
    };
  },
};
