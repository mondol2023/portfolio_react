import { injectStyle, randomOf, type SurpriseEffect } from "../effect";

/**
 * Re-sets the page in a different typeface.
 *
 * Not a random font — a random *voice*, picked from a short list of pairings
 * that were each chosen to be a coherent treatment of the same page. The three
 * families are the ones the site already self-hosts through `next/font`
 * (`--font-geist-sans`, `--font-geist-mono`, `--font-instrument-serif`), so
 * nothing is fetched at the moment of the swap and there is no flash of
 * fallback text while a webfont loads.
 *
 * `font-family` is not an animatable property, so the family itself lands in
 * one frame. Everything that *can* be interpolated — weight, tracking, size —
 * is given a transition, which is enough to keep the swap from reading as a
 * glitch.
 */

interface Voice {
  name: string;
  css: string;
}

/** Everything a treatment might restyle, in one place, so the list stays short. */
const HEADINGS = "html h1, html h2, html h3, html .text-display, html .text-section";

const VOICES: readonly [Voice, ...Voice[]] = [
  {
    name: "serif",
    css: `
      ${HEADINGS} {
        font-family: var(--font-instrument-serif), ui-serif, Georgia, serif;
        font-weight: 400;
        letter-spacing: -0.015em;
      }
    `,
  },
  {
    name: "serif italic",
    css: `
      ${HEADINGS} {
        font-family: var(--font-instrument-serif), ui-serif, Georgia, serif;
        font-weight: 400;
        font-style: italic;
        letter-spacing: -0.005em;
      }
      html .label-mono { font-style: italic; letter-spacing: 0.2em; }
    `,
  },
  {
    name: "typewriter",
    css: `
      html body { font-family: var(--font-geist-mono), ui-monospace, "SF Mono", monospace; }
      ${HEADINGS} { font-weight: 500; letter-spacing: -0.045em; }
      html p { text-wrap: initial; }
    `,
  },
  {
    name: "wide caps",
    css: `
      ${HEADINGS} {
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.09em;
        /* Caps read a size larger than lowercase; the trim keeps the rhythm. */
        font-size: 0.82em;
        line-height: 1.15;
      }
    `,
  },
  {
    name: "heavy",
    css: `
      ${HEADINGS} { font-weight: 800; letter-spacing: -0.055em; }
      html .label-mono { font-weight: 600; color: var(--tone); }
    `,
  },
  {
    name: "airy",
    css: `
      ${HEADINGS} { font-weight: 300; letter-spacing: 0.01em; }
      html p, html li { letter-spacing: 0.012em; line-height: 1.8; }
    `,
  },
];

/** Applied alongside every voice so the interpolatable half of the swap glides. */
const SETTLE = `
  html h1, html h2, html h3, html h4, html p, html li, html .label-mono {
    transition:
      font-size 600ms cubic-bezier(0.16, 1, 0.3, 1),
      font-weight 600ms ease,
      letter-spacing 600ms ease,
      line-height 600ms ease;
  }
`;

export const typeSwap: SurpriseEffect = {
  id: "type-swap",
  label: "The type changed voice",
  channel: "type",

  start() {
    const voice = randomOf(VOICES);
    return injectStyle("type-swap", SETTLE + voice.css);
  },
};
