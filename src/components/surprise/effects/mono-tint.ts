import { injectStyle, randomOf, ROOT, ROOT_DARK, type SurpriseEffect } from "../effect";

/**
 * Collapses the whole palette onto a single hue.
 *
 * The opposite move to `tone-shuffle`: instead of giving every section its own
 * colour, it takes all six away and hands the page one. Sections stop being
 * distinguishable by colour, which is the point — the page reads as a single
 * printed object rather than six chapters.
 *
 * The accent tokens go with them. Leaving buttons amber while every heading
 * turned teal would look like a bug rather than a decision, so `--accent` and
 * its family are re-derived from the same hue at the lightness each theme
 * needs. `--accent-fg` is set explicitly in both: a mid-lightness accent needs
 * white on it, a bright one needs near-black, and getting that wrong is the one
 * way a colour change here can hurt legibility.
 */

/** Hues that stay pleasant at both the light and dark lightness levels. */
const HUES = [14, 32, 58, 96, 152, 186, 214, 252, 288, 322] as const;

const FADE_MS = 900;

export const monoTint: SurpriseEffect = {
  id: "mono-tint",
  label: "The page picked one colour",
  channel: "palette",

  start() {
    const h = randomOf(HUES).toFixed(0);

    const light = `oklch(0.52 0.15 ${h})`;
    const dark = `oklch(0.8 0.13 ${h})`;

    return injectStyle(
      "mono-tint",
      `
        html [data-tone] {
          transition: --tone ${FADE_MS}ms ease, --tone-soft ${FADE_MS}ms ease;
          --tone: ${light};
          --tone-soft: oklch(0.52 0.15 ${h} / 0.13);
        }

        html.dark [data-tone] {
          --tone: ${dark};
          --tone-soft: oklch(0.8 0.13 ${h} / 0.15);
        }

        ${ROOT} {
          --accent: ${light};
          --accent-hover: oklch(0.44 0.15 ${h});
          --accent-fg: #ffffff;
          --accent-subtle: oklch(0.52 0.15 ${h} / 0.1);
          --accent-ring: oklch(0.52 0.15 ${h} / 0.35);
          --glow: oklch(0.52 0.15 ${h} / 0.12);
          --bg-subtle: oklch(0.97 0.014 ${h});
          --surface-hover: oklch(0.965 0.016 ${h});
          --border: oklch(0.9 0.02 ${h});
          --border-strong: oklch(0.82 0.035 ${h});
        }

        ${ROOT_DARK} {
          --accent: ${dark};
          --accent-hover: oklch(0.88 0.11 ${h});
          --accent-fg: oklch(0.18 0.04 ${h});
          --accent-subtle: oklch(0.8 0.13 ${h} / 0.12);
          --accent-ring: oklch(0.8 0.13 ${h} / 0.4);
          --glow: oklch(0.8 0.13 ${h} / 0.1);
          --bg-subtle: oklch(0.16 0.02 ${h});
          --surface-hover: oklch(0.2 0.024 ${h});
          --border: oklch(0.28 0.028 ${h});
          --border-strong: oklch(0.38 0.036 ${h});
        }
      `,
    );
  },
};
