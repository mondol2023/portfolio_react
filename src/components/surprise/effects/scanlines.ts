import { fadeIn, injectStyle, LAYER, mountLayer, randomOf, type SurpriseEffect } from "../effect";

/**
 * Puts the page behind the glass of a CRT.
 *
 * Four layers, each responsible for one artefact of the real thing: the scan
 * lines themselves, the aperture-grille stripe (a much finer *vertical* comb,
 * which is the detail most CRT filters leave out and the one that stops it
 * looking like venetian blinds), the phosphor tint, and the roll bar — a band
 * of slightly brighter light sweeping down the screen because the camera and
 * the tube are not in sync.
 *
 * The scan lines are drawn at a fixed 3px pitch in CSS pixels, so they stay the
 * same physical size regardless of viewport. Scaling them with the page would
 * turn them into stripes on a large monitor.
 *
 * The roll bar's period is long and deliberately not a round number — anything
 * that lines up with the eye's sense of rhythm stops being an artefact and
 * becomes an animation.
 */

interface Phosphor {
  name: string;
  tint: string;
}

/**
 * Phosphor colours real tubes actually used.
 *
 * Annotated rather than `as const`: `randomOf` fixes its type parameter from
 * the first element, so a const-asserted array of object literals makes every
 * later entry a type error.
 */
const PHOSPHORS: readonly [Phosphor, ...Phosphor[]] = [
  { name: "green", tint: "rgba(64, 255, 148, 0.09)" },
  { name: "amber", tint: "rgba(255, 176, 64, 0.1)" },
  { name: "white", tint: "rgba(180, 214, 255, 0.08)" },
];

const CSS = `
  @keyframes surprise-crt-roll {
    from { transform: translate3d(0, -30vh, 0); }
    to   { transform: translate3d(0, 112vh, 0); }
  }
  @keyframes surprise-crt-flicker {
    0%, 100% { opacity: 0.96; }
    47%      { opacity: 1; }
    52%      { opacity: 0.9; }
  }

  [data-surprise="scanlines"] {
    animation: surprise-crt-flicker 3.7s ease-in-out infinite;
  }

  /* Horizontal scan lines. */
  [data-surprise="scanlines"] i {
    position: absolute;
    inset: 0;
    display: block;
    background: repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.26) 0 1px,
      transparent 1px 3px
    );
  }

  /* Aperture grille — finer, vertical, and much fainter. */
  [data-surprise="scanlines"] s {
    position: absolute;
    inset: 0;
    display: block;
    background: repeating-linear-gradient(
      to right,
      rgba(255, 0, 80, 0.05) 0 1px,
      rgba(0, 255, 160, 0.05) 1px 2px,
      rgba(60, 120, 255, 0.05) 2px 3px
    );
  }

  /* Phosphor tint plus tube vignette, in one element. */
  [data-surprise="scanlines"] b {
    position: absolute;
    inset: 0;
    display: block;
    background:
      radial-gradient(120% 94% at 50% 48%, transparent 46%, rgba(0, 0, 0, 0.5) 100%),
      var(--phosphor);
  }

  /* The roll bar. */
  [data-surprise="scanlines"] u {
    position: absolute;
    inset: 0 0 auto 0;
    height: 22vh;
    display: block;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(255, 255, 255, 0.05) 45%,
      rgba(255, 255, 255, 0.08) 55%,
      transparent
    );
    animation: surprise-crt-roll 8.3s linear infinite;
    will-change: transform;
  }
`;

export const scanlines: SurpriseEffect = {
  id: "scanlines",
  label: "Switched to the old monitor",
  channel: "overlay",
  animated: true,
  loud: true,

  start() {
    const phosphor = randomOf(PHOSPHORS);

    const removeStyle = injectStyle("scanlines", CSS);
    const layer = mountLayer("scanlines", LAYER.overlay);

    layer.dataset.phosphor = phosphor.name;
    layer.style.setProperty("--phosphor", phosphor.tint);

    layer.append(
      document.createElement("b"),
      document.createElement("i"),
      document.createElement("s"),
      document.createElement("u"),
    );

    fadeIn(layer, 1, 700);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
