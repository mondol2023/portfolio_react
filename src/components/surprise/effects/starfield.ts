import { between, fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Opens the roof.
 *
 * Three tiled star layers rather than a few hundred elements: each one is a
 * handful of tiny `radial-gradient` dots painted into a repeating tile, so the
 * whole sky is three DOM nodes and three composited transforms no matter how
 * large the viewport is.
 *
 * The layers use different tile sizes and drift at different speeds, which is
 * the entire depth cue — parallax, not size, is what stops a star field looking
 * like wallpaper. Each also twinkles on its own period, so the sky never
 * brightens in unison.
 *
 * A single shooting star crosses on a long loop. One, not many: the point of a
 * shooting star is that you are lucky to catch it, and a sky full of them is
 * just more weather.
 */

interface Tier {
  /** Tile size — smaller tiles mean denser stars. */
  tile: string;
  /** Seconds for one drift cycle. Slower reads as further away. */
  drift: number;
  twinkle: number;
  opacity: number;
  dots: string;
}

const TIERS: readonly Tier[] = [
  {
    tile: "260px 220px",
    drift: 150,
    twinkle: 5.5,
    opacity: 0.5,
    dots: `
      radial-gradient(1px 1px at 18% 24%, rgba(255,255,255,0.9), transparent 100%),
      radial-gradient(1px 1px at 63% 11%, rgba(255,255,255,0.6), transparent 100%),
      radial-gradient(1px 1px at 41% 67%, rgba(255,255,255,0.75), transparent 100%),
      radial-gradient(1px 1px at 87% 52%, rgba(255,255,255,0.5), transparent 100%),
      radial-gradient(1px 1px at 8% 84%, rgba(255,255,255,0.65), transparent 100%)
    `,
  },
  {
    tile: "420px 380px",
    drift: 95,
    twinkle: 7.2,
    opacity: 0.75,
    dots: `
      radial-gradient(1.6px 1.6px at 29% 38%, rgba(255,255,255,0.95), transparent 100%),
      radial-gradient(1.4px 1.4px at 78% 21%, var(--tone), transparent 100%),
      radial-gradient(1.6px 1.6px at 54% 79%, rgba(214,232,255,0.9), transparent 100%),
      radial-gradient(1.3px 1.3px at 12% 62%, rgba(255,255,255,0.7), transparent 100%)
    `,
  },
  {
    tile: "700px 620px",
    drift: 58,
    twinkle: 9.4,
    opacity: 0.95,
    dots: `
      radial-gradient(2.4px 2.4px at 44% 31%, rgba(255,255,255,1), transparent 100%),
      radial-gradient(2.1px 2.1px at 81% 72%, var(--tone), transparent 100%),
      radial-gradient(2.2px 2.2px at 16% 88%, rgba(226,240,255,0.95), transparent 100%)
    `,
  },
];

const CSS = `
  @keyframes surprise-star-drift {
    from { transform: translate3d(0, 0, 0); }
    to   { transform: translate3d(-6%, 4%, 0); }
  }
  @keyframes surprise-star-twinkle {
    from { opacity: var(--dim); }
    to   { opacity: var(--lit); }
  }
  @keyframes surprise-star-shoot {
    0%      { transform: translate3d(0, 0, 0) rotate(18deg) scaleX(0); opacity: 0; }
    2%      { transform: translate3d(6vw, 2vh, 0) rotate(18deg) scaleX(1); opacity: 1; }
    9%      { transform: translate3d(52vw, 17vh, 0) rotate(18deg) scaleX(1); opacity: 0.9; }
    13%     { transform: translate3d(74vw, 24vh, 0) rotate(18deg) scaleX(0.4); opacity: 0; }
    100%    { transform: translate3d(74vw, 24vh, 0) rotate(18deg) scaleX(0); opacity: 0; }
  }

  [data-surprise="starfield"] {
    background:
      radial-gradient(120% 90% at 50% -20%, rgba(30, 41, 92, 0.55), transparent 70%),
      linear-gradient(to bottom, rgba(8, 10, 26, 0.62), rgba(4, 5, 14, 0.82));
  }

  [data-surprise="starfield"] i {
    position: absolute;
    /* Oversized so the drift never walks a tile edge into view. */
    inset: -12%;
    display: block;
    background-repeat: repeat;
    animation:
      surprise-star-drift var(--drift) linear infinite alternate,
      surprise-star-twinkle var(--twinkle) ease-in-out infinite alternate;
    will-change: transform, opacity;
  }

  [data-surprise="starfield"] b {
    position: absolute;
    top: 4%;
    left: -12%;
    width: 14vw;
    height: 2px;
    border-radius: 999px;
    transform-origin: 0 50%;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.95));
    filter: drop-shadow(0 0 6px rgba(255,255,255,0.7));
    animation: surprise-star-shoot 21s ease-in infinite;
  }
`;

export const starfield: SurpriseEffect = {
  id: "starfield",
  label: "Someone opened the roof",
  channel: "backdrop",
  animated: true,

  start() {
    const removeStyle = injectStyle("starfield", CSS);
    const layer = mountLayer("starfield", LAYER.backdrop);

    for (const tier of TIERS) {
      const sky = document.createElement("i");

      sky.style.cssText = [
        `background-image:${tier.dots.replace(/\s+/g, " ").trim()}`,
        `background-size:${tier.tile}`,
        `--drift:${tier.drift}s`,
        `--twinkle:${tier.twinkle}s`,
        `--dim:${(tier.opacity * 0.45).toFixed(2)}`,
        `--lit:${tier.opacity}`,
        // Desynchronise the twinkles; without this the whole sky pulses as one.
        `animation-delay:0s, ${(-between(0, tier.twinkle)).toFixed(2)}s`,
      ].join(";");

      layer.append(sky);
    }

    layer.append(document.createElement("b"));
    fadeIn(layer, 1, 1400);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
