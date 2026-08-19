import { HEADINGS, injectStyle, type SurpriseEffect } from "../effect";

/**
 * Puts the headings on a bad cable.
 *
 * Chromatic aberration — a red ghost one way, a cyan ghost the other — plus a
 * shove sideways. The whole trick is in the keyframe *timing*, not the values:
 * the animation sits at rest for over ninety percent of its cycle and does
 * everything in a few short bursts near the end. An evenly-spaced glitch is a
 * vibration; an interruption is a glitch.
 *
 * The two heading levels run at different periods and one is offset, so the
 * page never breaks up all at once — which would read as a page transition
 * rather than as interference.
 *
 * Marked `loud`: it is doing something aggressive to the words themselves, and
 * nothing else in a combination should be competing for the same attention.
 */

const KEYFRAMES = `
  @keyframes surprise-glitch {
    0%, 88%, 100% {
      transform: none;
      text-shadow: 0.012em 0 0 rgba(255, 40, 90, 0.5), -0.012em 0 0 rgba(0, 220, 255, 0.5);
    }
    89%  { transform: translate3d(-0.06em, 0, 0) skewX(-2deg);
           text-shadow: 0.07em 0 0 rgba(255, 40, 90, 0.85), -0.07em 0 0 rgba(0, 220, 255, 0.85); }
    91%  { transform: translate3d(0.05em, 0, 0);
           text-shadow: -0.05em 0 0 rgba(255, 40, 90, 0.8), 0.05em 0 0 rgba(0, 220, 255, 0.8); }
    92.5% { transform: translate3d(-0.02em, 0.01em, 0) skewX(1.5deg);
            text-shadow: 0.03em 0 0 rgba(255, 40, 90, 0.7), -0.03em 0 0 rgba(0, 220, 255, 0.7); }
    94%  { transform: none;
           text-shadow: 0.012em 0 0 rgba(255, 40, 90, 0.5), -0.012em 0 0 rgba(0, 220, 255, 0.5); }
  }
`;

export const glitchInk: SurpriseEffect = {
  id: "glitch-ink",
  label: "Signal interference",
  channel: "ink",
  animated: true,
  loud: true,

  start() {
    return injectStyle(
      "glitch-ink",
      `
        ${KEYFRAMES}

        ${HEADINGS} {
          animation: surprise-glitch 5.5s steps(1, end) infinite;
          will-change: transform;
        }

        /* Different period and phase, so the page never tears all at once. */
        html h2,
        html .text-section {
          animation-duration: 7.3s;
          animation-delay: -2.1s;
        }

        html h3 {
          animation-duration: 9.1s;
          animation-delay: -5.4s;
        }
      `,
    );
  },
};
