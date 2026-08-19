import { fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Runs the page through a projector.
 *
 * The grain is one inline SVG `feTurbulence` tile as a data URI — no image
 * request, no external host, and it tiles seamlessly because of `stitchTiles`.
 * A `feColorMatrix` desaturates it inside the filter chain rather than in CSS,
 * so the browser never composites the colour noise it would then have to throw
 * away.
 *
 * It is animated by jumping `background-position` in `steps()`, not by
 * interpolating it. Film grain is resampled every frame of the print; smoothly
 * sliding noise looks like a texture being dragged across the screen, which is
 * exactly the thing to avoid. Eight discrete positions at 12fps is enough to
 * read as random and far cheaper than regenerating noise.
 *
 * The vignette and the slow exposure flicker are the other half of the trick —
 * grain alone reads as a dirty screen, grain plus uneven light reads as film.
 */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E" +
  "%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E" +
  "%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E" +
  "%3Crect width='220' height='220' filter='url(%23g)' opacity='0.55'/%3E%3C/svg%3E\")";

const CSS = `
  @keyframes surprise-grain-jitter {
    0%   { background-position: 0 0; }
    12%  { background-position: -60px 30px; }
    25%  { background-position: 40px -70px; }
    37%  { background-position: -90px -20px; }
    50%  { background-position: 70px 60px; }
    62%  { background-position: -30px 90px; }
    75%  { background-position: 100px -40px; }
    87%  { background-position: -70px -90px; }
    100% { background-position: 0 0; }
  }
  @keyframes surprise-grain-exposure {
    0%, 100% { opacity: 0.9; }
    18%      { opacity: 1; }
    34%      { opacity: 0.82; }
    57%      { opacity: 0.97; }
    73%      { opacity: 0.86; }
  }

  [data-surprise="film-grain"] {
    animation: surprise-grain-exposure 7s ease-in-out infinite;
  }

  [data-surprise="film-grain"] i {
    position: absolute;
    inset: 0;
    display: block;
    background-image: ${GRAIN};
    background-repeat: repeat;
    /* 8 stops over 0.66s ~ 12fps, the rate a projector actually flickers at. */
    animation: surprise-grain-jitter 0.66s steps(1, end) infinite;
    opacity: 0.16;
    mix-blend-mode: overlay;
    will-change: background-position;
  }

  [data-surprise="film-grain"] b {
    position: absolute;
    inset: 0;
    display: block;
    background: radial-gradient(
      118% 92% at 50% 48%,
      transparent 42%,
      rgba(14, 10, 6, 0.24) 76%,
      rgba(14, 10, 6, 0.55) 100%
    );
  }

  /* A whisper of warm dye. Enough to be felt, not enough to be seen as a tint. */
  [data-surprise="film-grain"] u {
    position: absolute;
    inset: 0;
    display: block;
    background: linear-gradient(to bottom, rgba(120, 86, 42, 0.1), rgba(46, 34, 20, 0.12));
    mix-blend-mode: multiply;
  }
`;

export const filmGrain: SurpriseEffect = {
  id: "film-grain",
  label: "Shot on film",
  channel: "overlay",
  animated: true,
  loud: true,

  start() {
    const removeStyle = injectStyle("film-grain", CSS);
    const layer = mountLayer("film-grain", LAYER.overlay);

    layer.append(
      document.createElement("u"),
      document.createElement("b"),
      document.createElement("i"),
    );

    fadeIn(layer, 1, 900);

    return () => {
      layer.remove();
      removeStyle();
    };
  },
};
