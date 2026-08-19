import { injectStyle, ROOT, ROOT_DARK, type SurpriseEffect } from "../effect";

/**
 * Strips the colour out entirely and prints the page.
 *
 * Every hue in the token set goes to black or to paper-white, borders go to
 * full-strength ink, and the elevation tokens are set to `none` — a drop shadow
 * is a photographic idea and has no business on something pretending to be
 * printed. What is left is carried by weight and rule alone, which is why this
 * looks composed rather than merely desaturated.
 *
 * Because `* { border-color: var(--border) }` in the base layer resolves the
 * token at use time, changing one variable turns every hairline on the page
 * into a printed rule. Nothing has to be selected individually.
 */

const FADE_MS = 700;

export const inkAndPaper: SurpriseEffect = {
  id: "ink-and-paper",
  label: "Ink on paper",
  channel: "palette",
  // Colour applied to the letterforms would undo the entire premise.
  conflicts: ["gradient-ink", "neon-ink", "color-wash"],

  start() {
    return injectStyle(
      "ink-and-paper",
      `
        html body,
        html [data-tone] {
          transition:
            background-color ${FADE_MS}ms ease,
            color ${FADE_MS}ms ease,
            --tone ${FADE_MS}ms ease,
            --tone-soft ${FADE_MS}ms ease;
        }

        ${ROOT} {
          --bg: #fffdf7;
          --bg-subtle: #f5f1e6;
          --surface: #fffdf7;
          --surface-hover: #f2ede0;
          --surface-raised: #fffdf7;

          --border: #12100e;
          --border-strong: #12100e;

          --fg: #100e0c;
          --fg-muted: #38332f;
          --fg-subtle: #6a625b;

          --accent: #100e0c;
          --accent-hover: #38332f;
          --accent-fg: #fffdf7;
          --accent-subtle: #eee8da;
          --accent-ring: rgba(16, 14, 12, 0.4);

          --grid-line: rgba(16, 14, 12, 0.07);
          --glow: rgba(16, 14, 12, 0.05);

          --shadow-sm: none;
          --shadow-md: none;
          --shadow-lg: none;
        }

        ${ROOT_DARK} {
          --bg: #0a0908;
          --bg-subtle: #121110;
          --surface: #0a0908;
          --surface-hover: #171614;
          --surface-raised: #0a0908;

          --border: #f4efe4;
          --border-strong: #f4efe4;

          --fg: #f7f3ea;
          --fg-muted: #bdb6ab;
          --fg-subtle: #857d74;

          --accent: #f7f3ea;
          --accent-hover: #ffffff;
          --accent-fg: #0a0908;
          --accent-subtle: rgba(247, 243, 234, 0.1);
          --accent-ring: rgba(247, 243, 234, 0.4);

          --grid-line: rgba(247, 243, 234, 0.06);
          --glow: rgba(247, 243, 234, 0.04);

          --shadow-sm: none;
          --shadow-md: none;
          --shadow-lg: none;
        }

        html [data-tone] {
          --tone: #100e0c;
          --tone-soft: rgba(16, 14, 12, 0.07);
        }

        html.dark [data-tone] {
          --tone: #f7f3ea;
          --tone-soft: rgba(247, 243, 234, 0.08);
        }

        /* Hairlines read as accidents in print; a rule should look drawn. */
        html hr,
        html [role="separator"] {
          border-top-width: 2px;
        }
      `,
    );
  },
};
