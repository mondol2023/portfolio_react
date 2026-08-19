import { between, fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Lets a few dozen fireflies loose over the page.
 *
 * The wandering is two transforms composed rather than one path: the outer
 * element traces a slow horizontal figure, the inner one a faster vertical one,
 * and because the two periods are chosen independently per fly, the combined
 * path never closes into a visible loop. A single keyframed path — however many
 * stops it has — always eventually reads as a repeat.
 *
 * The glow pulses on a third period again, and drops to nearly nothing at the
 * bottom of the cycle. A firefly that is always lit is a floating dot; the dark
 * half of the pulse is what sells it.
 *
 * They take their colour from `--tone`, so they belong to whichever section of
 * the page they happen to be over.
 */

const FLIES = 22;

const CSS = `
  @keyframes surprise-fly-x {
    from { transform: translate3d(calc(var(--rx) * -1), 0, 0); }
    to   { transform: translate3d(var(--rx), 0, 0); }
  }
  @keyframes surprise-fly-y {
    from { transform: translate3d(0, var(--ry), 0); }
    to   { transform: translate3d(0, calc(var(--ry) * -1), 0); }
  }
  @keyframes surprise-fly-glow {
    0%, 100% { opacity: 0.05; }
    45%      { opacity: 1; }
    62%      { opacity: 0.7; }
  }

  [data-surprise="fireflies"] i {
    position: absolute;
    display: block;
    animation: surprise-fly-x var(--px) ease-in-out infinite alternate;
    will-change: transform;
  }

  [data-surprise="fireflies"] i > span {
    display: block;
    width: 100%;
    height: 100%;
    animation: surprise-fly-y var(--py) ease-in-out infinite alternate;
  }

  [data-surprise="fireflies"] i > span > b {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle, #fff8c4 0 22%, var(--tone) 46%, transparent 72%);
    box-shadow: 0 0 12px 2px var(--tone);
    animation: surprise-fly-glow var(--pulse) ease-in-out infinite;
  }
`;

export const fireflies: SurpriseEffect = {
  id: "fireflies",
  label: "Fireflies got in",
  channel: "weather",
  animated: true,

  start() {
    const removeStyle = injectStyle("fireflies", CSS);
    const layer = mountLayer("fireflies", LAYER.weather);

    for (let i = 0; i < FLIES; i += 1) {
      const size = between(4, 9);

      const fly = document.createElement("i");
      fly.style.cssText = [
        `left:${between(2, 96).toFixed(2)}%`,
        `top:${between(4, 92).toFixed(2)}%`,
        `width:${size.toFixed(1)}px`,
        `height:${size.toFixed(1)}px`,
        `--rx:${between(30, 140).toFixed(0)}px`,
        `--ry:${between(20, 100).toFixed(0)}px`,
        `--px:${between(7, 16).toFixed(2)}s`,
        `--py:${between(4, 11).toFixed(2)}s`,
        `--pulse:${between(2.2, 5.4).toFixed(2)}s`,
        // Three independent negative delays, so nothing is in step at frame one.
        `animation-delay:${(-between(0, 16)).toFixed(2)}s`,
      ].join(";");

      const arm = document.createElement("span");
      arm.style.animationDelay = `${(-between(0, 11)).toFixed(2)}s`;

      const lamp = document.createElement("b");
      lamp.style.animationDelay = `${(-between(0, 5.4)).toFixed(2)}s`;

      arm.append(lamp);
      fly.append(arm);
      layer.append(fly);
    }

    fadeIn(layer, 1, 1100);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
