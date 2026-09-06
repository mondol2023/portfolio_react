"use client";

import { useEffect, useState } from "react";

/**
 * Reads design tokens out of CSS and hands them to WebGL.
 *
 * Three.js cannot resolve `var(--tone)`, and the project's first rule is that
 * components never hardcode hex. This bridges the two: the scene asks for the
 * token names it wants and gets back concrete colours, so a palette change in
 * `globals.css` still moves the 3D lighting with it.
 *
 * Values are normalised through the browser's own colour parser rather than by
 * string matching. `--tone` is a registered `@property`, so its computed value
 * may come back as `rgb(194 65 12)`, `oklch(...)` or a hex literal depending on
 * how it was set and which browser is asking. Painting it onto a throwaway
 * element and reading `getComputedStyle().color` collapses all of those to the
 * legacy `rgb()` form, which is the one form Three understands.
 */

function normalise(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;opacity:0;pointer-events:none";
  probe.style.color = value;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const match = /rgba?\(([^)]+)\)/.exec(computed);
  if (!match?.[1]) return null;

  const [r = 0, g = 0, b = 0] = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);

  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * `--tone` and `--tone-soft` are declared on the *section* (`[data-tone="…"]`),
 * not on `<html>` — they inherit down from there. Reading them off the document
 * element would therefore only ever return the `@property` initial value, which
 * is why callers pass the selector of the element whose cascade they live in.
 */
function read(names: readonly string[], scope: string | undefined): Record<string, string> {
  if (typeof document === "undefined") return {};

  const element = (scope ? document.querySelector(scope) : null) ?? document.documentElement;
  const styles = getComputedStyle(element);
  const result: Record<string, string> = {};

  for (const name of names) {
    const colour = normalise(styles.getPropertyValue(name));
    if (colour) result[name] = colour;
  }

  return result;
}

/**
 * Safe to call from a component that renders on the server: the lazy initial
 * read short-circuits to `{}` there (and again during client hydration, before
 * `document` exists), then an effect syncs in the real values once mounted.
 *
 * @param names  Custom property names, e.g. `["--tone", "--bg"]`.
 * @param scope  Selector for the element to resolve them against. Omit for
 *               document-level tokens; pass `'[data-tone="hero"]'` for a
 *               section-scoped one.
 */
function sameColors(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export function useCssColors(names: readonly string[], scope?: string): Record<string, string> {
  const [colors, setColors] = useState(() => read(names, scope));

  // Callers pass `names` as an inline array literal (e.g. `["--tone", ...]`),
  // so its identity is brand new on every render. Depending on `names`
  // directly would make the effect below re-run on every render — and since
  // `read` always returns a fresh object, every run would call `setColors`,
  // triggering another render, forever. Depending on the joined string keeps
  // the effect tied to the *contents* of `names`, not the array reference.
  const key = names.join("|");

  useEffect(() => {
    // The lazy `useState` initializer above also runs during SSR (and again on
    // the client during hydration), where `document` doesn't exist yet — `read`
    // short-circuits to `{}` there. This syncs in the real values once we're
    // definitely on the client. Bailing out when nothing actually changed
    // avoids an extra render on mount.
    setColors((prev) => {
      const next = read(names, scope);
      return sameColors(prev, next) ? prev : next;
    });

    // The theme toggle swaps a class on <html>, and `subtree` carries that down
    // to whatever `scope` points at — one observer covers both a theme flip and
    // a section changing its own tone. Re-reading is cheap and only happens
    // when an attribute actually moved.
    const observer = new MutationObserver(() => {
      setColors((prev) => {
        const next = read(names, scope);
        return sameColors(prev, next) ? prev : next;
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class", "style", "data-tone"],
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scope]);

  return colors;
}
