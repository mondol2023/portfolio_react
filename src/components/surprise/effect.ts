/**
 * The surprise kit — shared contract.
 *
 * Every effect in `./effects` is a plain module that knows how to turn itself
 * on and how to put the page back exactly as it found it. Nothing about an
 * effect is React-shaped: it touches `document` directly and returns its own
 * undo, which is what lets the same file be used four ways —
 *
 *   1. bundled into `<SurpriseButton />`, chosen at random;
 *   2. pinned on by the admin dashboard, via `<SiteAnimations />`;
 *   3. dropped into any client component with `useSurpriseEffect(scenery)`;
 *   4. called imperatively from anywhere — `const stop = scenery.start()`.
 *
 * This module is deliberately *not* a Client Component. It declares types and
 * DOM helpers, none of which run at import time, so a Server Component can read
 * the registry's metadata to render a list of what exists — which is what the
 * admin animation toggles do. The hooks that need `"use client"` live next door
 * in `./use-surprise-effects.ts`.
 *
 * Effects style the page by appending an unlayered `<style>` to `<head>`.
 * That matters: Tailwind's own rules live in `@layer utilities`, and *any*
 * unlayered rule beats *any* layered one regardless of specificity — so an
 * effect can restyle `.text-section` without an `!important` anywhere. The
 * selectors are still written with an `html` prefix so they also win on
 * specificity, because the dev server injects stylesheets after ours.
 *
 * Root tokens are the one exception: `globals.css` sets them on `:root`, which
 * is *also* unlayered and outranks a bare `html`. Overriding those needs
 * `html:root` — see `ROOT` / `ROOT_DARK` below.
 */

/**
 * What part of the page an effect owns.
 *
 * The surprise button plays one to three effects at once, and this is what
 * keeps that from turning to mud: a combination never contains two effects from
 * the same channel. Two typefaces cannot both win, two backdrops would stack,
 * two dimming sheets would double up — so instead of hoping the maths works
 * out, each effect declares its lane and the picker takes at most one per lane.
 */
export type SurpriseChannel =
  /** Colour tokens — `--tone`, `--accent`, the surface stack. */
  | "palette"
  /** Typeface, weight, tracking. */
  | "type"
  /** How the letterforms themselves are filled: gradient, outline, glow. */
  | "ink"
  /** Type size ramps. */
  | "scale"
  /** Behind the content, above the page background. */
  | "backdrop"
  /** In front of the content — things that fall, rise, drift. */
  | "weather"
  /** A full-viewport sheet in front: tint, grain, vignette. */
  | "overlay"
  /** Borders, radii, shadows — the furniture rather than the words. */
  | "chrome"
  /** Movement applied to elements the page already has. */
  | "flow"
  /** Anything that follows the pointer. */
  | "cursor";

export interface SurpriseEffect {
  /** Stable id. Also the `data-surprise` value on anything the effect mounts. */
  id: string;
  /** What the reader is told just happened. */
  label: string;
  /** The lane this effect occupies; at most one per lane in a combination. */
  channel: SurpriseChannel;
  /**
   * True when the effect *is* movement rather than styling. Those are dropped
   * entirely under `prefers-reduced-motion` — slowing them down is not the same
   * as not asking for them.
   */
  animated?: boolean;
  /**
   * True when the effect dominates the whole viewport. At most one of these
   * appears in a combination: two showstoppers at once cancel each other out,
   * and the quiet effects are what make the loud one legible.
   */
  loud?: boolean;
  /**
   * Ids this effect must not share a combination with, for clashes the channel
   * rule cannot see — a monochrome palette against rainbow lettering, two
   * different ways of darkening the same corners.
   */
  conflicts?: readonly string[];
  /** Turns the effect on, and returns the function that turns it off again. */
  start: () => () => void;
}

/**
 * Selectors for the root token block.
 *
 * `globals.css` declares the palette on `:root` (specificity 0,1,0) and the
 * dark palette on `.dark` (also 0,1,0, winning on order). Both are unlayered,
 * so an override has to beat them on specificity rather than on layering:
 * `html:root` is 0,1,1 and `html:root.dark` is 0,2,1.
 */
export const ROOT = "html:root";
export const ROOT_DARK = "html:root.dark";

/** Every heading surface worth restyling, in one place. */
export const HEADINGS = "html h1, html h2, html h3, html .text-display, html .text-section";

/** Picks one at random. Typed against a non-empty tuple so there is no `undefined` case. */
export function randomOf<T>(items: readonly [T, ...T[]]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

/** Random float in `[min, max)`. */
export function between(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer in `[min, max]`. */
export function betweenInt(min: number, max: number): number {
  return Math.floor(between(min, max + 1));
}

/** A shuffled copy. Fisher–Yates, so every ordering is equally likely. */
export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }

  return copy;
}

/**
 * Appends a stylesheet and returns its remover.
 *
 * Deliberately unlayered — see the note at the top of this file.
 */
export function injectStyle(id: string, css: string): () => void {
  const style = document.createElement("style");
  style.dataset.surprise = id;
  style.textContent = css;
  document.head.append(style);

  return () => style.remove();
}

/**
 * Mounts a full-screen decorative layer on `<body>`.
 *
 * Negative `z` puts it behind the page content but still above the painted body
 * background, which is where scenery belongs; positive `z` puts it in front,
 * which is where weather belongs. Either way it is inert and invisible to
 * assistive tech, and `contain` keeps whatever moves inside it from making the
 * rest of the document re-layout.
 */
export function mountLayer(id: string, z: number): HTMLDivElement {
  const layer = document.createElement("div");

  layer.dataset.surprise = id;
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = [
    "position:fixed",
    "inset:0",
    `z-index:${z}`,
    "pointer-events:none",
    "overflow:hidden",
    "contain:layout paint style",
  ].join(";");

  document.body.append(layer);
  return layer;
}

/**
 * The z-index shelves the layered effects share.
 *
 * Written down once so two effects that *are* allowed to run together — an
 * overlay and weather, say — never argue about which is on top.
 */
export const LAYER = {
  /** Over the site's ambient backdrop (-10), under every word on the page. */
  backdrop: -8,
  /** In front of the content, under anything falling through it. */
  overlay: 44,
  /** Snow, paper, bubbles. */
  weather: 45,
  /** Whatever is chasing the pointer sits on top of all of it. */
  cursor: 46,
} as const;

/**
 * Fades an element up to `opacity` on the frame after it is mounted.
 *
 * Two frames, not one: the first commits the starting opacity, the second
 * changes it. Set both in the same frame and the browser coalesces them into
 * one style recalculation, there is no start value to interpolate from, and the
 * layer simply appears.
 */
export function fadeIn(element: HTMLElement, opacity: number, ms = 900): void {
  element.style.opacity = "0";
  element.style.transition = `opacity ${ms}ms ease`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.style.opacity = String(opacity);
    });
  });
}

