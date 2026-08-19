import { SECTION_TONES } from "@/lib/constants/section-tone";

import { injectStyle, randomOf, type SurpriseEffect } from "../effect";

/**
 * Repaints every section's colour identity.
 *
 * The site gives each section a hue so a reader can tell where they are without
 * reading the heading — `--tone` for text and rules, `--tone-soft` for the wash
 * the ambient background paints with. This picks a fresh scheme for all six at
 * once and cross-fades to it.
 *
 * Hues are generated rather than listed. A random starting angle plus a fixed
 * step around the colour wheel gives a scheme that is *related* by
 * construction: a small step lands on analogous colours, a large one on a
 * spread, 137° on something close to evenly distributed. Lightness and chroma
 * stay fixed at values that clear contrast on each theme's background, so a
 * random hue can never produce unreadable text — which is exactly the failure
 * a hand-written list of "fun" palettes eventually hits.
 *
 * The cross-fade is the reason `--tone` is registered with `@property` in
 * `globals.css`: an untyped custom property is an unparsed token and cannot be
 * transitioned, so this would jump between hues instead of gliding.
 */

/** Degrees between one section's hue and the next. */
const STEPS = [17, 34, 62, 137] as const;

/** Fixed per theme so contrast never depends on the roll of the dice. */
const LIGHT = { l: 0.55, c: 0.17 };
const DARK = { l: 0.79, c: 0.14 };

const FADE_MS = 900;

export const toneShuffle: SurpriseEffect = {
  id: "tone-shuffle",
  label: "Every section changed colour",
  channel: "palette",

  start() {
    const base = Math.random() * 360;
    const step = randomOf(STEPS);
    const direction = Math.random() < 0.5 ? -1 : 1;

    const rules = SECTION_TONES.map((tone, index) => {
      const hue = (((base + direction * index * step) % 360) + 360) % 360;
      const h = hue.toFixed(1);

      /*
       * Both a bare and a `.dark`-scoped rule, because `globals.css` sets the
       * dark tones with `.dark [data-tone=...]` — a two-class selector that
       * would otherwise outrank a one-attribute override. The `html` prefix
       * puts these ahead of both.
       */
      return [
        `html [data-tone="${tone}"] {`,
        `  --tone: oklch(${LIGHT.l} ${LIGHT.c} ${h});`,
        `  --tone-soft: oklch(${LIGHT.l} ${LIGHT.c} ${h} / 0.14);`,
        `}`,
        `html.dark [data-tone="${tone}"] {`,
        `  --tone: oklch(${DARK.l} ${DARK.c} ${h});`,
        `  --tone-soft: oklch(${DARK.l} ${DARK.c} ${h} / 0.16);`,
        `}`,
      ].join("\n");
    });

    return injectStyle(
      "tone-shuffle",
      [
        // The ambient background already fades its own tone; this extends the
        // same courtesy to the sections, which normally have no reason to.
        `html [data-tone] { transition: --tone ${FADE_MS}ms ease, --tone-soft ${FADE_MS}ms ease; }`,
        ...rules,
      ].join("\n"),
    );
  },
};
