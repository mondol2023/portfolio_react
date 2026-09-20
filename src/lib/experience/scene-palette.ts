/**
 * Scene colour, derived from the page's own tokens.
 *
 * `use-css-colors.ts` collapses every custom property through the browser's
 * colour parser and returns `#rrggbb` — which silently drops alpha. That is
 * fine for `--tone` (an opaque accent) but destroys `--tone-soft`, which is
 * declared as `rgba(190, 18, 60, 0.12)`: the wash the 2D ambient background
 * paints at 12% opacity arrives in WebGL as *full-strength crimson*. Before
 * this file the scene was therefore lighting itself with two copies of the
 * same saturated accent and fogging the world in it.
 *
 * So the scene stops trusting `--tone-soft` and derives its own palette from
 * the two tokens that survive the round trip intact: the section accent and
 * the page background. Everything else — the wash that `--tone-soft` *meant*,
 * the key light's warm near-white, the matte body colour, the darkest backing
 * plane — is mixed from those two here, in one place, so a palette change in
 * `globals.css` still moves the whole 3D layer with it.
 *
 * Deliberately free of any `three` import: `scene-root.tsx` is not
 * code-split, so anything it can reach must stay out of the first-load
 * bundle. The mixing below is plain sRGB arithmetic on hex strings.
 */

export interface ScenePalette {
  /** The section accent at full strength — emissive rims and the accent light. */
  accent: string;
  /** What `--tone-soft`'s alpha actually meant: the accent as it lands over the page. */
  wash: string;
  /** The page background — the ground the whole scene sits on. */
  atmosphere: string;
  /**
   * What distance actually dissolves into: `atmosphere` stepped one notch
   * further away, so the far field reads as a recess rather than a hole cut
   * back to the page. Derived from the background alone, never the accent —
   * the depth of the room must not flash at every section boundary.
   */
  horizon: string;
  /** Key light. Never pure white: warm-neutral, faintly carrying the accent. */
  key: string;
  /** The weak fill from behind, tinted rather than grey. */
  fill: string;
  /** The matte body colour geometry starts from — the spec's 70% neutral. */
  surface: string;
  /** Backing plates and the darkest end of the depth stack. */
  deep: string;
  /** True when the page is in dark mode; the rig balances differently on each. */
  dark: boolean;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const FALLBACK_ACCENT: Rgb = { r: 194, g: 65, b: 12 };
const FALLBACK_BG: Rgb = { r: 251, g: 250, b: 249 };

function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex;
  if (full.length !== 6 || !/^[0-9a-f]{6}$/i.test(full)) return null;

  const int = Number.parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = Math.min(1, Math.max(0, amount));
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/** Perceived brightness, 0–1 — only ever used to answer "is this page dark?". */
function luminance({ r, g, b }: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === red
      ? ((green - blue) / d + (green < blue ? 6 : 0)) / 6
      : max === green
        ? ((blue - red) / d + 2) / 6
        : ((red - green) / d + 4) / 6;

  return { h, s, l };
}

function fromHsl(h: number, s: number, l: number): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (offset: number): number => {
    let t = h + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return { r: channel(1 / 3) * 255, g: channel(0) * 255, b: channel(-1 / 3) * 255 };
}

/** Keeps a mix's hue and chroma but moves it to a chosen brightness. */
function atLightness(color: Rgb, lightness: number): Rgb {
  const { h, s } = toHsl(color);
  return fromHsl(h, s, Math.min(1, Math.max(0, lightness)));
}

/** WCAG relative luminance. Gamma-correct, unlike `luminance` above, which only
 *  answers "is this page dark?". Hue rotation is safe against this one. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** The luminance a neutral grey at this HSL lightness would have. */
function neutralLuminance(lightness: number): number {
  return relativeLuminance(fromHsl(0, 0, lightness));
}

/** Holds hue and chroma, moves lightness until the colour hits `target`.
 *  Bisected: lightness → luminance has no closed form once hue is involved. */
function atLuminance(color: Rgb, target: number): Rgb {
  const { h, s } = toHsl(color);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    if (relativeLuminance(fromHsl(h, s, mid)) < target) lo = mid;
    else hi = mid;
  }
  return fromHsl(h, s, (lo + hi) / 2);
}

/** A skin value that may differ by page theme. An authored colour is a claim
 *  about the page under it, and one value for both always underserves one:
 *  blueprint's single cyan read 8.95:1 dark and 2.12:1 on paper. */
export type ThemedSkinValue<T> = T | { light: T; dark: T };

function byTheme<T>(value: ThemedSkinValue<T>, dark: boolean): T {
  if (typeof value === "object" && value !== null && "light" in value) {
    return dark ? value.dark : value.light;
  }
  return value;
}

/** Post-processes a derived palette — see `scenery.ts`'s `ScenerySkin`. */
export interface ScenerySkin {
  /** Overrides the line/accent colour outright, regardless of section `--tone`. */
  lineColor?: ThemedSkinValue<string>;
  /** Rotates the accent's hue toward this target (degrees) by `hueBlend` — e.g. observatory's cold 210°. */
  hueTowardDeg?: number;
  /** How far toward `hueTowardDeg` to rotate, 0–1. Defaults to 1 (all the way) once `hueTowardDeg` is set. */
  hueBlend?: number;
  /** Multiplies the accent's saturation. */
  chromaScale?: number;
  /** Forces `surface`'s lightness (0–1), keeping its hue and chroma — e.g. observatory staying dark in light mode. */
  surfaceLightness?: ThemedSkinValue<number>;
}

/** Shortest signed distance (0–1 hue wheel) from `from` to `to`, so a hue rotation always takes the near way round. */
function hueDelta(from: number, to: number): number {
  const raw = to - from;
  return raw - Math.round(raw);
}

/**
 * @param tone The section's resolved `--tone`, e.g. `"#be123c"`.
 * @param background The resolved `--bg` for the current theme.
 */
export function buildScenePalette(tone: string, background: string): ScenePalette {
  const accent = parseHex(tone) ?? FALLBACK_ACCENT;
  const page = parseHex(background) ?? FALLBACK_BG;
  const dark = luminance(page) < 0.4;

  // The wash is the accent seen *through* the page, which is what the CSS
  // `rgba()` was describing — mixed a little stronger than 12% because WebGL
  // renders it as a light colour rather than a flat overlay.
  const wash = mix(page, accent, dark ? 0.34 : 0.26);

  // Aerial perspective, in the direction each theme actually has room to move:
  // on paper distance goes down in lightness, on a near-black page it goes up,
  // because there is nothing below #0a0a0a to recede into.
  const pageLightness = toHsl(page).l;
  const horizon = atLightness(page, dark ? pageLightness + 0.05 : pageLightness - 0.045);

  return {
    accent: toHex(accent),
    wash: toHex(wash),
    atmosphere: toHex(page),
    horizon: toHex(horizon),
    // "No harsh white": a warm near-white carrying a trace of the section hue,
    // so the key never reads as a studio strobe against a warm neutral page.
    key: toHex(mix({ r: 255, g: 251, b: 245 }, accent, dark ? 0.14 : 0.07)),
    fill: toHex(atLightness(mix(page, accent, 0.5), dark ? 0.42 : 0.6)),
    // Mid-lightness in both themes: geometry must separate from the page
    // rather than sink into it, which a straight tint of `--bg` would do.
    //
    // Held as a luminance, not an HSL lightness: the accent mixed in is a
    // different hue per section, and HSL lightness does not track brightness
    // across hues. A fixed 0.31 ranged 1.98–3.46:1 by section; this is 2.4:1
    // everywhere, in both themes.
    surface: toHex(
      atLuminance(mix(page, accent, dark ? 0.22 : 0.3), neutralLuminance(dark ? 0.31 : 0.64)),
    ),
    // Backing plates take `horizon`'s rule: on paper there is room below to go
    // dark, on a near-black page there is not. A fixed 0.06 read 1.01–1.07:1
    // against `--bg`, i.e. no depth stack at all in dark mode.
    deep: toHex(atLightness(mix(page, accent, 0.18), dark ? pageLightness + 0.13 : 0.17)),
    dark,
  };
}

/**
 * Overrides a derived palette's colour (S4) — e.g. blueprint's drafting cyan
 * (`lineColor`, Phase G) or observatory's cold hue-shift and forced-dark
 * surface (`hueTowardDeg`/`chromaScale`/`surfaceLightness`, Phase I).
 * Recomputes `accent`, `wash` and `key` from whichever override applies,
 * using the same page-mix `buildScenePalette` used, so they stay consistent
 * with how they will actually render over the page; `deep`, `atmosphere` and
 * `horizon` are left alone since those come from the page background, not
 * the accent.
 */
export function applyScenerySkin(palette: ScenePalette, skin: ScenerySkin | undefined): ScenePalette {
  if (!skin) return palette;

  let accent = parseHex(palette.accent) ?? FALLBACK_ACCENT;

  if (skin.lineColor) {
    accent = parseHex(byTheme(skin.lineColor, palette.dark)) ?? accent;
  } else if (skin.hueTowardDeg !== undefined || skin.chromaScale !== undefined) {
    const hsl = toHsl(accent);
    const targetHue = skin.hueTowardDeg !== undefined ? (((skin.hueTowardDeg % 360) + 360) % 360) / 360 : hsl.h;
    const blend = skin.hueBlend ?? 1;
    const h = (hsl.h + hueDelta(hsl.h, targetHue) * blend + 1) % 1;
    const s = Math.min(1, Math.max(0, hsl.s * (skin.chromaScale ?? 1)));
    // Rotate at constant luminance, not constant HSL lightness: the `--tone`
    // ladder is tuned so each accent clears 4.5:1 on `--bg`, and lightness does
    // not encode that. Holding it dropped garden's contact tone to 1.95:1.
    accent = atLuminance(fromHsl(h, s, hsl.l), relativeLuminance(accent));
  } else if (skin.surfaceLightness === undefined) {
    return palette;
  }

  const page = parseHex(palette.atmosphere) ?? FALLBACK_BG;
  const wash = mix(page, accent, palette.dark ? 0.34 : 0.26);
  const surface =
    skin.surfaceLightness !== undefined
      ? toHex(atLightness(parseHex(palette.surface) ?? FALLBACK_BG, byTheme(skin.surfaceLightness, palette.dark)))
      : palette.surface;

  return {
    ...palette,
    accent: toHex(accent),
    wash: toHex(wash),
    key: toHex(mix({ r: 255, g: 251, b: 245 }, accent, palette.dark ? 0.14 : 0.07)),
    surface,
  };
}
