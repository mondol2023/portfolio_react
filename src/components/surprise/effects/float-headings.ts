import { injectStyle, type SurpriseEffect } from "../effect";

/**
 * Sets the headings gently adrift.
 *
 * Nothing here is keyed to a specific element — each heading level gets its own
 * period and its own negative delay, and because the periods are mutually
 * irrational-ish (6.4, 7.9, 5.3, 9.1 seconds) the page never returns to a state
 * where everything is aligned. A single shared animation would have every
 * heading rising and falling in lockstep, which reads as the whole page
 * scrolling rather than as individual things floating.
 *
 * The travel is six pixels and a third of a degree. That is deliberately below
 * the threshold where you would describe it as "moving" — you notice that the
 * page is alive without being able to point at what is doing it.
 *
 * `transform` only, so nothing re-layouts and no text ever re-wraps mid-float.
 */

const CSS = `
  @keyframes surprise-float {
    from { transform: translate3d(0, -6px, 0) rotate(-0.35deg); }
    to   { transform: translate3d(0, 6px, 0) rotate(0.35deg); }
  }

  html h1,
  html h2,
  html h3,
  html .text-display,
  html .text-section,
  html .label-mono {
    animation: surprise-float 6.4s ease-in-out infinite alternate;
    will-change: transform;
  }

  html h2,
  html .text-section { animation-duration: 7.9s; animation-delay: -3.1s; }

  html h3 { animation-duration: 5.3s; animation-delay: -1.4s; }

  html .label-mono {
    animation-duration: 9.1s;
    animation-delay: -4.2s;
    /* An inline element cannot be transformed; the eyebrows are spans. */
    display: inline-block;
  }
`;

export const floatHeadings: SurpriseEffect = {
  id: "float-headings",
  label: "The headings won't sit still",
  channel: "flow",
  animated: true,

  start() {
    return injectStyle("float-headings", CSS);
  },
};
