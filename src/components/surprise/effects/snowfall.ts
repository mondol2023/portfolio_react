import { between, fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Snow, which is confetti with different physics.
 *
 * Two nested elements again — the outer one falls, the inner one sways — but
 * where confetti tumbles end over end, snow drifts side to side on a long
 * period. Same structure, and the difference between the two effects is
 * entirely in the timing.
 *
 * Flakes are sorted into three depths. Near flakes are larger, brighter, fall
 * faster and are blurred *less*; far ones are small, dim and slightly out of
 * focus. That combination — not size alone — is what puts the snow in front of
 * and behind the reader rather than all on one pane of glass.
 *
 * Every flake starts with a negative delay, so the first frame already has snow
 * at every height instead of a curtain descending from the top.
 */

const FLAKES = 60;

interface Depth {
  size: [number, number];
  fall: [number, number];
  opacity: [number, number];
  blur: number;
  /** Share of the total flake count. */
  share: number;
}

const DEPTHS: readonly Depth[] = [
  { size: [2, 4], fall: [16, 26], opacity: [0.25, 0.45], blur: 1.4, share: 0.45 },
  { size: [4, 6.5], fall: [11, 17], opacity: [0.5, 0.7], blur: 0.5, share: 0.35 },
  { size: [6.5, 10], fall: [7, 11], opacity: [0.75, 0.95], blur: 0, share: 0.2 },
];

const CSS = `
  @keyframes surprise-snow-fall {
    from { transform: translate3d(0, -12vh, 0); }
    to   { transform: translate3d(0, 112vh, 0); }
  }
  @keyframes surprise-snow-sway {
    from { transform: translate3d(calc(var(--sway) * -1), 0, 0); }
    to   { transform: translate3d(var(--sway), 0, 0); }
  }

  [data-surprise="snowfall"] i {
    position: absolute;
    top: 0;
    display: block;
    animation: surprise-snow-fall var(--fall) linear var(--offset) infinite;
    will-change: transform;
  }

  [data-surprise="snowfall"] i > span {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 32%, #ffffff, rgba(226, 240, 255, 0.75) 62%, rgba(198, 222, 255, 0.1));
    animation: surprise-snow-sway var(--swayTime) ease-in-out infinite alternate;
  }
`;

export const snowfall: SurpriseEffect = {
  id: "snowfall",
  label: "It started snowing",
  channel: "weather",
  animated: true,

  start() {
    const removeStyle = injectStyle("snowfall", CSS);
    const layer = mountLayer("snowfall", LAYER.weather);

    for (const depth of DEPTHS) {
      const count = Math.round(FLAKES * depth.share);

      for (let i = 0; i < count; i += 1) {
        const size = between(depth.size[0], depth.size[1]);
        const fall = between(depth.fall[0], depth.fall[1]);

        const flake = document.createElement("i");
        flake.style.cssText = [
          `left:${between(-3, 100).toFixed(2)}%`,
          `width:${size.toFixed(1)}px`,
          `height:${size.toFixed(1)}px`,
          `opacity:${between(depth.opacity[0], depth.opacity[1]).toFixed(2)}`,
          depth.blur > 0 ? `filter:blur(${depth.blur}px)` : "",
          `--fall:${fall.toFixed(2)}s`,
          `--offset:${(-Math.random() * fall).toFixed(2)}s`,
          `--sway:${between(6, 26).toFixed(0)}px`,
          `--swayTime:${between(2.4, 6.5).toFixed(2)}s`,
        ]
          .filter(Boolean)
          .join(";");

        const body = document.createElement("span");
        flake.append(body);
        layer.append(flake);
      }
    }

    fadeIn(layer, 1, 900);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
