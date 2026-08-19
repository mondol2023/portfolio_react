import { between, fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Six enormous soft blobs, moving too slowly to watch.
 *
 * Deliberately slower than the site's own ambient blobs — the shortest cycle
 * here is half a minute, and every blob has its own period, so the composition
 * never repeats a frame you have already seen. Anything faster on shapes this
 * large stops being atmosphere and starts being a screensaver.
 *
 * Each blob gets its own random hue, but they share a lightness and chroma, so
 * the group holds together no matter which hues come up. They are sized in
 * `vmax` rather than pixels: a blob that fills a phone should still fill a
 * desktop, or it turns into a dot in the corner.
 *
 * `blur` is on each blob rather than on the container. Blurring the container
 * would flatten them into one wash and lose the overlaps, which are the only
 * place the colours actually mix.
 */

const BLOBS = 6;

const CSS = `
  @keyframes surprise-lava-drift {
    0%   { transform: translate3d(0, 0, 0) scale(1); }
    33%  { transform: translate3d(var(--dx), var(--dy), 0) scale(1.22); }
    66%  { transform: translate3d(calc(var(--dx) * -0.7), calc(var(--dy) * 0.8), 0) scale(0.86); }
    100% { transform: translate3d(0, 0, 0) scale(1); }
  }

  [data-surprise="lava-lamp"] i {
    position: absolute;
    display: block;
    border-radius: 50%;
    filter: blur(var(--soft));
    mix-blend-mode: screen;
    animation: surprise-lava-drift var(--period) ease-in-out infinite;
    will-change: transform;
  }

  /*
   * Screen blending brightens what is under it, which is right on a dark page
   * and wrong on a light one — there it just washes out. Light theme multiplies
   * instead, so the blobs deepen the page rather than bleaching it.
   */
  html:not(.dark) [data-surprise="lava-lamp"] i {
    mix-blend-mode: multiply;
    opacity: 0.5;
  }
`;

export const lavaLamp: SurpriseEffect = {
  id: "lava-lamp",
  label: "Lava lamp",
  channel: "backdrop",
  animated: true,

  start() {
    const removeStyle = injectStyle("lava-lamp", CSS);
    const layer = mountLayer("lava-lamp", LAYER.backdrop);

    const base = Math.random() * 360;

    for (let i = 0; i < BLOBS; i += 1) {
      const size = between(34, 62);
      const hue = (base + (360 / BLOBS) * i + between(-18, 18)) % 360;

      const blob = document.createElement("i");
      blob.style.cssText = [
        `width:${size.toFixed(1)}vmax`,
        `height:${size.toFixed(1)}vmax`,
        `left:${between(-18, 82).toFixed(1)}%`,
        `top:${between(-18, 82).toFixed(1)}%`,
        `background:radial-gradient(circle at 38% 34%, oklch(0.72 0.2 ${hue.toFixed(0)} / 0.85), oklch(0.55 0.19 ${hue.toFixed(0)} / 0.25) 62%, transparent 78%)`,
        `--soft:${between(40, 90).toFixed(0)}px`,
        `--dx:${between(-22, 22).toFixed(1)}vw`,
        `--dy:${between(-18, 18).toFixed(1)}vh`,
        `--period:${between(32, 68).toFixed(1)}s`,
        // Negative delay: the lamp is already warmed up when it appears.
        `animation-delay:${(-between(0, 60)).toFixed(1)}s`,
      ].join(";");

      layer.append(blob);
    }

    fadeIn(layer, 0.8, 1500);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
