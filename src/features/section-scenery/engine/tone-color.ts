import { SECTION_TONES, type SectionTone } from "@/lib/constants/section-tone";

/**
 * Where a scene's colours come from.
 *
 * The site already owns a light *and* a dark value for every section tone
 * (`globals.css`, `[data-tone="…"]` and `.dark [data-tone="…"]`), so nothing in
 * this feature invents a colour or branches on the theme to pick one. It reads
 * what is already there.
 *
 * The reading is deliberately *not* done against `.ambient` itself. `--tone` is
 * a registered `@property` with `syntax: "<color>"` and a 900ms transition, and
 * a registered colour interpolates in oklab — so for most of the time that
 * matters, the computed value is an `oklab(…)` string rather than the `rgb()`
 * a naive parser expects. A throwaway probe carrying `data-tone` sidesteps that
 * entirely: `transition` is not an inherited property, so the probe never
 * animates, and every read is the stylesheet's own sRGB value.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface TonePalette {
  /** `--tone` — the readable accent. */
  tone: Rgb;
  /** `--tone-soft` — the translucent wash, with its alpha kept separately so a
   *  primitive can scale it rather than fight it. */
  soft: Rgb;
  softAlpha: number;
  /** True while the dark palette is in force. Scenes use this for *density* and
   *  *opacity* — never to choose a colour, which is already handled above. */
  dark: boolean;
}

export type TonePalettes = Record<SectionTone, TonePalette>;

/** Mid grey. Only reachable if the tone stylesheet failed to load at all, in
 *  which case something visible is better than a scene drawing in `undefined`. */
const FALLBACK: Rgb = { r: 140, g: 140, b: 140 };

export function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

/** Mixes toward white (`amount > 0`) or black (`amount < 0`). Scenes use this to
 *  derive a couple of related swatches from one tone — the several-swatches-per-
 *  look idea taken from schemeengine.com, without a second source of truth. */
export function shade(color: Rgb, amount: number): Rgb {
  const target = amount >= 0 ? 255 : 0;
  const k = Math.abs(amount);
  return {
    r: Math.round(color.r + (target - color.r) * k),
    g: Math.round(color.g + (target - color.g) * k),
    b: Math.round(color.b + (target - color.b) * k),
  };
}

function parse(value: string): { rgb: Rgb; alpha: number } | null {
  const text = value.trim();
  if (text === "") return null;

  if (text.startsWith("#")) {
    const hex = text.slice(1);
    const wide = hex.length >= 6;
    const step = wide ? 2 : 1;
    const at = (i: number) => {
      const part = hex.slice(i * step, i * step + step);
      const full = wide ? part : part + part;
      return Number.parseInt(full, 16);
    };
    const rgb = { r: at(0), g: at(1), b: at(2) };
    if (Number.isNaN(rgb.r) || Number.isNaN(rgb.g) || Number.isNaN(rgb.b)) return null;
    return { rgb, alpha: 1 };
  }

  // `rgb(1 2 3 / 0.5)` and `rgba(1, 2, 3, 0.5)` both reduce to their numbers.
  if (text.startsWith("rgb")) {
    const parts = text.match(/-?\d*\.?\d+/g);
    if (!parts || parts.length < 3) return null;
    const [r, g, b, a] = parts.map(Number);
    if (r === undefined || g === undefined || b === undefined) return null;
    return { rgb: { r, g, b }, alpha: a ?? 1 };
  }

  return null;
}

/**
 * Reads every tone in one pass.
 *
 * One probe, six attribute writes, twelve property reads, then it is gone. Doing
 * this once at mount rather than per frame is what keeps the render loop free of
 * `getComputedStyle`, which forces a style recalculation every time it is called.
 */
export function readTonePalettes(): TonePalettes {
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:0;height:0;pointer-events:none;visibility:hidden";
  document.body.append(probe);

  const dark = document.documentElement.classList.contains("dark");
  const palettes = {} as TonePalettes;

  for (const tone of SECTION_TONES) {
    probe.dataset.tone = tone;
    const style = getComputedStyle(probe);
    const accent = parse(style.getPropertyValue("--tone"));
    const wash = parse(style.getPropertyValue("--tone-soft"));

    palettes[tone] = {
      tone: accent?.rgb ?? FALLBACK,
      soft: wash?.rgb ?? accent?.rgb ?? FALLBACK,
      softAlpha: wash?.alpha ?? 0.14,
      dark,
    };
  }

  probe.remove();
  return palettes;
}

/**
 * Calls back when `next-themes` flips `.dark` on `<html>`.
 *
 * This is the feature's only theme read. It is not a hydration hazard: the class
 * is written before hydration and this observer only ever fires on a *later*
 * change, so there is no first-render branch to get wrong. What it changes is
 * colour values, not which code path runs — the scenes are identical in both
 * themes.
 */
export function watchTheme(onChange: () => void): () => void {
  let dark = document.documentElement.classList.contains("dark");

  const observer = new MutationObserver(() => {
    const next = document.documentElement.classList.contains("dark");
    if (next === dark) return;
    dark = next;
    onChange();
  });

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
