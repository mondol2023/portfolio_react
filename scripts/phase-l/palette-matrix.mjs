/**
 * Phase L Part 9 — the 3D half of the light/dark x scenery matrix, offline.
 *
 * Every colour the WebGL layer paints is derived, not authored: the page
 * hands `--tone` and `--bg` to `buildScenePalette`, and the scenery
 * post-processes the result through `applyScenerySkin`. Both are pure
 * functions with no `three` import, so the whole 8-cell x 6-section matrix is
 * arithmetic — no browser, no GPU, no settle. That matters here because this
 * sandbox's SwiftShader canvas cannot be trusted for anything but a
 * screenshot, and "is the geometry visible against the backdrop" is exactly
 * the question a 250ms frame makes hard to answer by eye.
 *
 * Thresholds are per role, not one blanket number — a backing plate and an
 * emissive rim are not held to the same bar:
 *
 *   accent  3.0  WCAG 1.4.11 non-text contrast. Rims, lines and the accent
 *                light carry meaning, and in blueprint they are the object.
 *   surface 2.0  A shaded body brings its own lighting cues, so it clears a
 *                lower bar than a flat UI shape — but below ~2 it sinks.
 *   deep    1.15 Only has to read as a recess. The failure it catches is the
 *                plate collapsing onto the page, i.e. a hole, not a recess.
 *   key/surf 1.4 Lit face against unlit face. Below this the form is flat.
 *   tone     4.5 The same token the DOM eyebrow prints in, as small type.
 */

import { buildScenePalette, applyScenerySkin } from "../../src/lib/experience/scene-palette.ts";
import { SCENERIES, SCENERY_IDS } from "../../src/lib/experience/scenery.ts";

/** Mirrors `globals.css` — the tokens the scene actually reads, per theme. */
const BG = { light: "#fbfaf9", dark: "#0c0a09" };
const TONES = {
  light: {
    hero: "#c2410c",
    about: "#6d28d9",
    stack: "#0e7490",
    work: "#be123c",
    experience: "#047857",
    contact: "#1d4ed8",
  },
  dark: {
    hero: "#fb923c",
    about: "#a78bfa",
    stack: "#22d3ee",
    work: "#fb7185",
    experience: "#34d399",
    contact: "#60a5fa",
  },
};

const MIN = { accent: 3, surface: 2, deep: 1.15, keySurface: 1.4, toneType: 4.5 };

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relLuminance(hex) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function contrast(a, b) {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const f = (n) => n.toFixed(2).padStart(5);
const fails = [];

for (const scenery of SCENERY_IDS) {
  const def = SCENERIES[scenery];
  if (!def) continue;

  for (const theme of ["light", "dark"]) {
    console.log(`\n${scenery} x ${theme}`);
    console.log("  section      surface  deep  accent  wash   key/surf  tone-as-type");

    for (const [section, tone] of Object.entries(TONES[theme])) {
      const p = applyScenerySkin(buildScenePalette(tone, BG[theme]), def.skin);

      const row = {
        // Can you see the geometry at all against the page behind it?
        surface: contrast(p.surface, p.atmosphere),
        // The backing plates, which carry the depth read.
        deep: contrast(p.deep, p.atmosphere),
        // Emissive rims and the accent light, seen over the page.
        accent: contrast(p.accent, p.atmosphere),
        // What `--tone-soft` meant: the accent as it lands over the page.
        wash: contrast(p.wash, p.atmosphere),
        // Lit vs unlit face — a key that cannot separate from the body is flat.
        keySurface: contrast(p.key, p.surface),
        // The same `--tone` the DOM eyebrow prints in, on the same `--bg`.
        toneType: contrast(tone, BG[theme]),
      };

      console.log(
        `  ${section.padEnd(11)} ${f(row.surface)} ${f(row.deep)} ${f(row.accent)} ${f(row.wash)} ` +
          `${f(row.keySurface)}    ${f(row.toneType)}`,
      );

      const check = (name, value, min) => {
        if (value < min) fails.push({ scenery, theme, section, name, value, min });
      };
      check("surface vs backdrop", row.surface, MIN.surface);
      check("deep vs backdrop", row.deep, MIN.deep);
      check("accent vs backdrop", row.accent, MIN.accent);
      check("key vs surface", row.keySurface, MIN.keySurface);
      check("--tone as small type", row.toneType, MIN.toneType);
    }
  }
}

console.log(`\n${"=".repeat(72)}`);
if (fails.length === 0) {
  console.log("PASS — all 8 cells clear every threshold.");
} else {
  console.log(`${fails.length} reading(s) under threshold:\n`);
  for (const x of fails) {
    console.log(
      `  ${x.scenery}/${x.theme}/${x.section}  ${x.name}: ${x.value.toFixed(2)} (min ${x.min})`,
    );
  }
}
process.exitCode = fails.length === 0 ? 0 : 1;
