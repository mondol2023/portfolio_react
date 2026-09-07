import { fadeIn, injectStyle, LAYER, mountLayer, type SurpriseEffect } from "../effect";

/**
 * Swaps the system arrow for a two-part cursor that notices what it is over.
 *
 * The direct inspiration is the small custom-cursor treatment shared by almost
 * every Awwwards-tier creative-developer portfolio surveyed for this feature
 * (Richard Ekwonye, Matthew Encina, Noth, Samsy) — a dot glued to the pointer
 * and a ring that trails a step behind it, both drawn in `mix-blend-mode:
 * difference` so a single pair of shapes reads against a light page, a dark
 * one, or a photograph without ever asking which. See
 * `docs/design-research/award-portfolio-plan.md` for the full survey
 * this and its sibling ideas came out of.
 *
 * Two moving parts rather than one, each doing a different job:
 *
 *   - The dot is glued to the real pointer position with zero lag, every
 *     frame `pointermove` fires. It is what keeps the illusion that this *is*
 *     the cursor rather than a decoration chasing it.
 *   - The ring eases toward the same point on a `requestAnimationFrame` loop,
 *     the same "chase a fraction of the remaining distance" rule `spotlight`
 *     and `cursor-trail` already use. The lag is what makes it read as a
 *     ring around the cursor instead of a second cursor.
 *
 * The ring also grows a notch — via a CSS class flip, not a JS-driven
 * resize — whenever the pointer sits over anything clickable, which is the
 * whole reason to have a ring at all: it is the one piece of chrome on the
 * page that can say "this is a target" before the reader commits to a click.
 *
 * A fine pointer only. Touch has no cursor to replace, and `pointer: fine`
 * is checked once at start rather than watched, matching how the rest of the
 * kit treats touch: `spotlight`'s light simply never moves there, this simply
 * never mounts.
 */

const CSS = `
  html[data-magnetic-cursor],
  html[data-magnetic-cursor] a,
  html[data-magnetic-cursor] button,
  html[data-magnetic-cursor] [role="button"],
  html[data-magnetic-cursor] input,
  html[data-magnetic-cursor] textarea,
  html[data-magnetic-cursor] select,
  html[data-magnetic-cursor] summary {
    cursor: none;
  }

  [data-surprise="magnetic-cursor"] i {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    border-radius: 50%;
    background: #fff;
    mix-blend-mode: difference;
    will-change: transform;
  }

  [data-surprise="magnetic-cursor"] .mc-dot {
    width: 7px;
    height: 7px;
    margin: -3.5px 0 0 -3.5px;
  }

  [data-surprise="magnetic-cursor"] .mc-ring {
    width: 32px;
    height: 32px;
    margin: -16px 0 0 -16px;
    background: transparent;
    border: 1.5px solid #fff;
    transition: width 200ms ease, height 200ms ease, margin 200ms ease;
  }

  [data-surprise="magnetic-cursor"] .mc-ring.mc-on-target {
    width: 54px;
    height: 54px;
    margin: -27px 0 0 -27px;
  }
`;

/** Anything a click actually does something to. */
const TARGET_SELECTOR = 'a, button, [role="button"], input, textarea, select, summary';

/** Fraction of the remaining distance the ring closes per frame. */
const EASE = 0.22;
/** Below this the ring has arrived and the loop parks itself. */
const SETTLED = 0.4;

export const magneticCursor: SurpriseEffect = {
  id: "magnetic-cursor",
  label: "The cursor started noticing what's clickable",
  channel: "cursor",
  animated: true,

  start() {
    if (!window.matchMedia("(pointer: fine)").matches) {
      // No arrow to replace on a touch screen — nothing was mounted, so
      // there is nothing to undo.
      return () => {};
    }

    const removeStyle = injectStyle("magnetic-cursor", CSS);
    document.documentElement.setAttribute("data-magnetic-cursor", "");

    const layer = mountLayer("magnetic-cursor", LAYER.cursor);
    const dot = document.createElement("i");
    dot.className = "mc-dot";
    const ring = document.createElement("i");
    ring.className = "mc-ring";
    layer.append(dot, ring);
    fadeIn(layer, 1, 300);

    // Both start mid-screen, same reasoning as `spotlight`: somewhere sensible
    // before the first `pointermove`, which on this device will always come.
    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight * 0.45;
    let targetX = ringX;
    let targetY = ringY;
    let frame = 0;

    dot.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

    const step = () => {
      const dx = targetX - ringX;
      const dy = targetY - ringY;

      if (Math.abs(dx) < SETTLED && Math.abs(dy) < SETTLED) {
        ringX = targetX;
        ringY = targetY;
        frame = 0;
      } else {
        ringX += dx * EASE;
        ringY += dy * EASE;
        frame = requestAnimationFrame(step);
      }

      ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      if (!frame) frame = requestAnimationFrame(step);
    };

    // Delegated and on `pointerover` rather than checked inside `onMove`:
    // it only has to run once per element boundary crossed, not once per
    // pixel moved.
    const onOver = (event: PointerEvent) => {
      const target = event.target;
      const onClickable = target instanceof Element && target.closest(TARGET_SELECTOR) !== null;
      ring.classList.toggle("mc-on-target", onClickable);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeAttribute("data-magnetic-cursor");
      layer.remove();
      removeStyle();
    };
  },
};
