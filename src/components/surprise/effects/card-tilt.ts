import { injectStyle, type SurpriseEffect } from "../effect";

/**
 * Makes the project grid react to where the pointer is, not just whether it
 * is there.
 *
 * The card already lifts four pixels and brightens its border on hover. That
 * tells you it is interactive; it does not make it feel like an object. This
 * leans the card toward the pointer in 3D, lifts it a little further, and
 * sweeps a soft warm light across its surface tracking where the pointer sits
 * — which is the one thing the readable half of the surveyed award portfolios
 * (Noth in particular) does that this site did not. See
 * `docs/motion-lab/card-tilt.md` for the survey and the decisions behind the
 * numbers below.
 *
 * The light is mixed from the site's own `--accent` rather than being the
 * usual white specular. White at low alpha is invisible on a near-white
 * surface, so a white glare only ever works in dark mode; the accent mix reads
 * on both, and makes the card look lit by this site rather than glossed by a
 * generic overlay.
 *
 * Everything visual lives in the stylesheet below. JavaScript writes five
 * numbers per frame as custom properties and never builds a `transform`
 * string, which is the same split `spotlight.ts` uses — the design stays
 * legible as CSS instead of being concatenated at 60fps.
 *
 * Fine pointers only. A tilt keyed to a pointer position is meaningless on a
 * touch screen, so on one the effect declines to mount at all.
 */

/** The cards this applies to — `project-card.tsx`, and nothing else on the site. */
const CARD_SELECTOR = "article.rounded-card";

/** Degrees at the very corner. Past about 7° the type reads as distorted, not angled. */
const MAX_TILT = 5.5;
/** Pixels the card rises at full tilt, and the extra scale that comes with it. */
const LIFT = -6;
const SCALE = 0.015;

/** Fraction of the remaining distance closed per frame, at 60fps. */
const EASE = 0.14;
/** Below this, on every axis, the card has arrived. */
const SETTLED = 0.01;

const CSS = `
  html [data-card-tilt] {
    /*
     * The card sets \`transition-[border-color,box-shadow,transform]\` for its
     * ordinary hover. A 300ms transition on a transform that is rewritten
     * every frame arrives smeared and a third of a second late, so transform
     * is dropped from the list here — the border and shadow fades stay.
     */
    transition-property: border-color, box-shadow;

    transform:
      perspective(1100px)
      rotateX(var(--tilt-rx, 0deg))
      rotateY(var(--tilt-ry, 0deg))
      translate3d(0, calc(var(--tilt-k, 0) * ${LIFT}px), 0)
      scale(calc(1 + var(--tilt-k, 0) * ${SCALE}));
    will-change: transform;
  }

  html [data-card-tilt]::before {
    content: "";
    position: absolute;
    inset: 0;
    /*
     * Above the card's content and above the stretched link's own \`::after\`,
     * but inert — the whole card has to stay one click target.
     */
    z-index: 2;
    pointer-events: none;

    /*
     * Opacity reads a custom property, and \`opacity\` is animatable — so the
     * light fades in and out on this transition for free and only the
     * geometry needs a frame loop.
     */
    opacity: var(--tilt-k, 0);
    transition: opacity 260ms var(--ease-site);

    background: radial-gradient(
      18rem circle at var(--tilt-gx, 50%) var(--tilt-gy, 50%),
      color-mix(in oklab, var(--accent) 26%, transparent),
      color-mix(in oklab, var(--accent) 8%, transparent) 38%,
      transparent 70%
    );
  }
`;

interface Tilt {
  /** Current values, chasing the targets below. */
  rx: number;
  ry: number;
  k: number;
  /** Where the values are heading. All three are zero once the pointer leaves. */
  targetRx: number;
  targetRy: number;
  targetK: number;
}

export const cardTilt: SurpriseEffect = {
  id: "card-tilt",
  label: "The project cards started leaning toward you",
  channel: "flow",
  animated: true,

  start() {
    if (!window.matchMedia("(pointer: fine)").matches) {
      // Nothing was mounted, so there is nothing to undo.
      return () => {};
    }

    const removeStyle = injectStyle("card-tilt", CSS);

    /*
     * Usually one entry, briefly two: the card being left is still easing back
     * to flat while the card being entered is already leaning. An entry is
     * dropped — and its properties cleared — the moment it is both inactive
     * and settled.
     */
    const live = new Map<HTMLElement, Tilt>();
    let hovered: HTMLElement | null = null;
    /**
     * The card currently carrying `data-card-tilt`.
     *
     * The attribute is what hands transform ownership from the card's own
     * hover rule to this effect, and it is stamped in the same task as the
     * `:hover` that starts that rule — never a frame later. Stamped late, the
     * card spends one frame animating its hover `translateY` under a 300ms
     * transition and then has that transition yanked out from under it, which
     * lands as a visible snap on the first pixel of pointer travel.
     */
    let stamped: HTMLElement | null = null;

    /** Last pointer position, kept so a scroll can re-aim without a pointer move. */
    let pointerX = -1;
    let pointerY = -1;
    /** Set by the handlers, consumed once by the next frame. */
    let needsAim = false;
    let frame = 0;

    const rest = (element: HTMLElement) => {
      element.removeAttribute("data-card-tilt");
      element.style.removeProperty("--tilt-rx");
      element.style.removeProperty("--tilt-ry");
      element.style.removeProperty("--tilt-k");
      element.style.removeProperty("--tilt-gx");
      element.style.removeProperty("--tilt-gy");
    };

    /**
     * Marks the card the pointer is on. Cheap enough for the input path:
     * an attribute write and, at most, one `rest()` — no measurement.
     *
     * A card being *left* keeps its attribute until it has eased back to flat,
     * because it is still being transformed; `step` drops it at that point.
     * One that was stamped but never started leaning has nothing to ease, so
     * it is cleared here instead of being stranded with the attribute on.
     */
    const stampCard = (card: HTMLElement | null) => {
      if (card === stamped) return;
      if (stamped && !live.has(stamped)) rest(stamped);
      stamped = card;
      card?.setAttribute("data-card-tilt", "");
    };

    /*
     * Deliberately called from inside the frame rather than from the event
     * handler: `getBoundingClientRect` forces layout, and doing that on the
     * browser's input path is how a `pointermove` handler starts costing more
     * than the animation it drives.
     */
    const aim = () => {
      const card =
        pointerX < 0
          ? null
          : (document.elementFromPoint(pointerX, pointerY)?.closest(CARD_SELECTOR) ?? null);

      if (card !== hovered && hovered) {
        const previous = live.get(hovered);
        if (previous) {
          previous.targetRx = 0;
          previous.targetRy = 0;
          previous.targetK = 0;
        }
      }

      hovered = card instanceof HTMLElement ? card : null;
      // Scrolling under a still pointer can slide a different card under it
      // without any boundary event firing, so the frame re-stamps too. Both
      // paths are no-ops when the card has not actually changed.
      stampCard(hovered);
      if (!hovered) return;

      const box = hovered.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;

      // −0.5 … 0.5 from the card's centre, on both axes.
      const px = (pointerX - box.left) / box.width - 0.5;
      const py = (pointerY - box.top) / box.height - 0.5;

      let tilt = live.get(hovered);
      if (!tilt) {
        tilt = { rx: 0, ry: 0, k: 0, targetRx: 0, targetRy: 0, targetK: 0 };
        live.set(hovered, tilt);
      }

      // Pointer above centre tips the top edge away, so `rotateX` follows the
      // vertical offset inverted; `rotateY` follows the horizontal one directly.
      tilt.targetRx = -py * 2 * MAX_TILT;
      tilt.targetRy = px * 2 * MAX_TILT;
      tilt.targetK = 1;

      // The light sits under the pointer and needs no easing of its own — it
      // is a soft gradient, and lagging it would read as a smear. Rounded to
      // one decimal: this is the position of an 18rem blur, so the digits past
      // it are sub-pixel, and they are a longer string to build and parse on
      // every frame of every pointer move.
      hovered.style.setProperty("--tilt-gx", `${((px + 0.5) * 100).toFixed(1)}%`);
      hovered.style.setProperty("--tilt-gy", `${((py + 0.5) * 100).toFixed(1)}%`);
    };

    const step = () => {
      if (needsAim) {
        needsAim = false;
        aim();
      }

      let moving = false;

      for (const [element, tilt] of live) {
        tilt.rx += (tilt.targetRx - tilt.rx) * EASE;
        tilt.ry += (tilt.targetRy - tilt.ry) * EASE;
        tilt.k += (tilt.targetK - tilt.k) * EASE;

        const arrived =
          Math.abs(tilt.targetRx - tilt.rx) < SETTLED &&
          Math.abs(tilt.targetRy - tilt.ry) < SETTLED &&
          Math.abs(tilt.targetK - tilt.k) < SETTLED;

        if (arrived && element !== hovered) {
          // Flat, and nobody is on it: hand the card back to its own hover
          // styles and stop paying for a compositor layer.
          live.delete(element);
          rest(element);
          continue;
        }

        element.style.setProperty("--tilt-rx", `${tilt.rx.toFixed(3)}deg`);
        element.style.setProperty("--tilt-ry", `${tilt.ry.toFixed(3)}deg`);
        element.style.setProperty("--tilt-k", tilt.k.toFixed(4));

        if (!arrived) moving = true;
      }

      // Park unless something is still travelling or a sample is waiting.
      frame = moving || needsAim ? requestAnimationFrame(step) : 0;
    };

    const wake = () => {
      needsAim = true;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      wake();
    };

    /*
     * Delegated, and the only reason a second pointer listener exists: this is
     * the same task that flips `:hover`, so the attribute — and with it the
     * transform ownership — changes in the same style recalculation as the
     * hover rule it overrides. Doing it from the frame instead lets one frame
     * of the card's own 300ms hover lift start, then rips its transition away
     * mid-tween, which is visible as a snap on the first pixel of travel.
     *
     * `pointerover` fires once per boundary crossing rather than per move, and
     * the handler does an attribute write and a `closest()` walk — no
     * measurement. That stays in the frame, where it belongs.
     */
    const onOver = (event: PointerEvent) => {
      const target = event.target;
      const card = target instanceof Element ? target.closest(CARD_SELECTOR) : null;
      if (card === stamped) return;
      stampCard(card instanceof HTMLElement ? card : null);
      wake();
    };

    // Scrolling under a held pointer moves the card without firing a
    // `pointermove`, which would otherwise leave the tilt aimed at where the
    // card used to be.
    const onScroll = () => {
      if (pointerX >= 0) wake();
    };

    // The pointer leaving the document entirely reports no related target.
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        pointerX = -1;
        pointerY = -1;
        wake();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);

      for (const element of live.keys()) rest(element);
      live.clear();

      // The card under the pointer may have been marked without a frame having
      // run yet, in which case it is not in `live` and the loop above missed it.
      if (stamped) rest(stamped);
      stamped = null;

      removeStyle();
    };
  },
};
