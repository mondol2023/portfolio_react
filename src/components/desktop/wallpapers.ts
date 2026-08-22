import type { CSSProperties } from "react";

import type { SectionTone } from "@/lib/constants/section-tone";

/**
 * One wallpaper per section, in both themes.
 *
 * Pure CSS gradients rather than image files: no asset pipeline, no licensing,
 * no bytes over the wire, and — the deciding reason — they inherit the palette
 * the rest of the site already uses, so a wallpaper cannot drift out of sync
 * with its section's tone.
 *
 * Each one differs in *geometry*, not only hue. A recolour of the same gradient
 * six times would read as one wallpaper with a tint slider; a sunrise, an
 * aurora, a blueprint, a spotlight, a horizon and a night sky read as six
 * different desktops, which is the point of the metaphor.
 *
 * Both variants are always rendered and switched with `opacity` in CSS (see
 * `wallpaper-field.tsx`), the same trick `AmbientBackground` uses — so nothing
 * here has to read the theme, and there is no wrong-mode flash on hydration.
 */

export interface Wallpaper {
  /** Shown in the start menu, purely for flavour. */
  name: string;
  light: CSSProperties;
  dark: CSSProperties;
}

export const WALLPAPERS: Record<SectionTone, Wallpaper> = {
  /* Sunrise — light gathering at the bottom-left, the way a day starts. */
  hero: {
    name: "Ember Dawn",
    light: {
      backgroundColor: "#f9f4ef",
      backgroundImage: [
        "radial-gradient(120% 85% at 16% 104%, rgba(251, 146, 60, 0.5) 0%, rgba(251, 146, 60, 0.12) 44%, transparent 72%)",
        "radial-gradient(80% 55% at 86% 6%, rgba(253, 224, 71, 0.32) 0%, transparent 62%)",
        "linear-gradient(180deg, #fff7ed 0%, #fbfaf9 56%, #fdf1e6 100%)",
      ].join(","),
    },
    dark: {
      backgroundColor: "#0c0a09",
      backgroundImage: [
        "radial-gradient(120% 85% at 16% 104%, rgba(194, 65, 12, 0.55) 0%, rgba(194, 65, 12, 0.14) 44%, transparent 70%)",
        "radial-gradient(75% 50% at 86% 4%, rgba(251, 146, 60, 0.16) 0%, transparent 62%)",
        "linear-gradient(180deg, #18110b 0%, #0c0a09 58%, #150f0a 100%)",
      ].join(","),
    },
  },

  /* Aurora — a violet sheet hanging from the top-right corner. */
  about: {
    name: "Violet Aurora",
    light: {
      backgroundColor: "#f8f6fc",
      backgroundImage: [
        "radial-gradient(85% 72% at 94% 2%, rgba(167, 139, 250, 0.46) 0%, transparent 60%)",
        "radial-gradient(70% 60% at 4% 92%, rgba(109, 40, 217, 0.16) 0%, transparent 62%)",
        "linear-gradient(200deg, #f5f1fd 0%, #fbfaf9 58%, #f2edfb 100%)",
      ].join(","),
    },
    dark: {
      backgroundColor: "#0b0a0e",
      backgroundImage: [
        "radial-gradient(85% 72% at 94% 2%, rgba(109, 40, 217, 0.5) 0%, transparent 62%)",
        "radial-gradient(70% 60% at 4% 92%, rgba(167, 139, 250, 0.13) 0%, transparent 60%)",
        "linear-gradient(200deg, #150f24 0%, #0b0a0e 62%, #100c1a 100%)",
      ].join(","),
    },
  },

  /* Blueprint — hairline diagonals under a cyan wash. The technical one. */
  stack: {
    name: "Cyan Blueprint",
    light: {
      backgroundColor: "#f2f8fa",
      backgroundImage: [
        "repeating-linear-gradient(135deg, rgba(14, 116, 144, 0.06) 0px, rgba(14, 116, 144, 0.06) 1px, transparent 1px, transparent 15px)",
        "radial-gradient(95% 70% at 50% -6%, rgba(34, 211, 238, 0.4) 0%, transparent 62%)",
        "linear-gradient(180deg, #eef8fb 0%, #fbfaf9 72%)",
      ].join(","),
    },
    dark: {
      backgroundColor: "#080b0c",
      backgroundImage: [
        "repeating-linear-gradient(135deg, rgba(34, 211, 238, 0.055) 0px, rgba(34, 211, 238, 0.055) 1px, transparent 1px, transparent 15px)",
        "radial-gradient(95% 70% at 50% -6%, rgba(14, 116, 144, 0.5) 0%, transparent 62%)",
        "linear-gradient(180deg, #091518 0%, #080b0c 72%)",
      ].join(","),
    },
  },

  /* Spotlight — a single pool of light in the middle, for the work on show. */
  work: {
    name: "Rose Spotlight",
    light: {
      backgroundColor: "#fbf5f6",
      backgroundImage: [
        "radial-gradient(58% 52% at 50% 40%, rgba(251, 113, 133, 0.34) 0%, transparent 66%)",
        "radial-gradient(100% 60% at -6% 106%, rgba(190, 18, 60, 0.16) 0%, transparent 60%)",
        "linear-gradient(155deg, #fdf2f4 0%, #fbfaf9 56%, #fbedf0 100%)",
      ].join(","),
    },
    dark: {
      backgroundColor: "#0d0809",
      backgroundImage: [
        "radial-gradient(58% 52% at 50% 40%, rgba(190, 18, 60, 0.5) 0%, transparent 66%)",
        "radial-gradient(100% 60% at -6% 106%, rgba(251, 113, 133, 0.11) 0%, transparent 60%)",
        "linear-gradient(155deg, #180c10 0%, #0d0809 60%)",
      ].join(","),
    },
  },

  /* Horizon — two overlapping ridges rising off the bottom edge. */
  experience: {
    name: "Emerald Horizon",
    light: {
      backgroundColor: "#f4faf7",
      backgroundImage: [
        "radial-gradient(140% 52% at 18% 112%, rgba(4, 120, 87, 0.3) 0%, transparent 60%)",
        "radial-gradient(120% 44% at 82% 116%, rgba(52, 211, 153, 0.4) 0%, transparent 60%)",
        "linear-gradient(180deg, #f2fbf7 0%, #fbfaf9 62%)",
      ].join(","),
    },
    dark: {
      backgroundColor: "#070b09",
      backgroundImage: [
        "radial-gradient(140% 52% at 18% 112%, rgba(4, 120, 87, 0.55) 0%, transparent 60%)",
        "radial-gradient(120% 44% at 82% 116%, rgba(52, 211, 153, 0.16) 0%, transparent 58%)",
        "linear-gradient(180deg, #0a1611 0%, #070b09 64%)",
      ].join(","),
    },
  },

  /* Night — deep blue, glow low on the horizon. The last screen of the day. */
  contact: {
    name: "Deep Signal",
    light: {
      backgroundColor: "#f3f6fc",
      backgroundImage: [
        "radial-gradient(100% 68% at 50% 108%, rgba(29, 78, 216, 0.24) 0%, transparent 62%)",
        "radial-gradient(70% 50% at 12% 2%, rgba(96, 165, 250, 0.36) 0%, transparent 60%)",
        "linear-gradient(180deg, #edf3fd 0%, #fbfaf9 56%, #f0f4fd 100%)",
      ].join(","),
    },
    dark: {
      backgroundColor: "#07090e",
      backgroundImage: [
        "radial-gradient(100% 68% at 50% 108%, rgba(29, 78, 216, 0.5) 0%, transparent 62%)",
        "radial-gradient(70% 50% at 12% 2%, rgba(96, 165, 250, 0.13) 0%, transparent 58%)",
        "linear-gradient(180deg, #0a1122 0%, #07090e 64%)",
      ].join(","),
    },
  },
};
