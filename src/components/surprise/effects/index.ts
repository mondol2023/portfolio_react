import type { SurpriseEffect } from "../effect";

import { bubbles } from "./bubbles";
import { colorWash } from "./color-wash";
import { confettiRain } from "./confetti-rain";
import { cursorTrail } from "./cursor-trail";
import { filmGrain } from "./film-grain";
import { fireflies } from "./fireflies";
import { floatHeadings } from "./float-headings";
import { glitchInk } from "./glitch-ink";
import { gradientInk } from "./gradient-ink";
import { gridWarp } from "./grid-warp";
import { inkAndPaper } from "./ink-and-paper";
import { lavaLamp } from "./lava-lamp";
import { monoTint } from "./mono-tint";
import { neonInk } from "./neon-ink";
import { outlineInk } from "./outline-ink";
import { riverPath } from "@/features/river-scenery/river-path";
import { scanlines } from "./scanlines";
import { scenery } from "./scenery";
import { sharpChrome } from "./sharp-chrome";
import { sizeShift } from "./size-shift";
import { snowfall } from "./snowfall";
import { softChrome } from "./soft-chrome";
import { spotlight } from "./spotlight";
import { starfield } from "./starfield";
import { stickerChrome } from "./sticker-chrome";
import { toneShuffle } from "./tone-shuffle";
import { typeSwap } from "./type-swap";
import { vignette } from "./vignette";

/**
 * The bag the surprise button draws from.
 *
 * This barrel exists for the button's benefit, not the effects'. Each effect is
 * a standalone module with no knowledge of this file or of each other, so
 * importing one directly costs nothing:
 *
 * ```tsx
 * import { scenery } from "@/components/surprise/effects/scenery";
 * import { useSurpriseEffect } from "@/components/surprise/use-surprise-effects";
 *
 * useSurpriseEffect(scenery);
 * ```
 *
 * Adding an effect to the button is adding a line here; taking one out of
 * rotation without deleting it is removing a line here.
 *
 * The list is grouped by channel — the lane an effect occupies, and the thing
 * that stops two of them colliding when the button plays several at once. See
 * `SurpriseChannel` in `../effect.ts` and `../combo.ts` for how a set is built.
 */
export const SURPRISE_EFFECTS: readonly SurpriseEffect[] = [
  // palette — colour tokens
  toneShuffle,
  monoTint,
  inkAndPaper,

  // type — typeface and tracking
  typeSwap,

  // ink — how the letterforms themselves are filled
  gradientInk,
  outlineInk,
  neonInk,
  glitchInk,

  // scale — type size
  sizeShift,

  // backdrop — behind the content
  scenery,
  starfield,
  gridWarp,
  lavaLamp,
  riverPath,

  // weather — in front of the content
  confettiRain,
  snowfall,
  bubbles,
  fireflies,

  // overlay — a sheet over the whole viewport
  filmGrain,
  colorWash,
  scanlines,
  vignette,

  // chrome — borders, radii, shadows
  softChrome,
  sharpChrome,
  stickerChrome,

  // flow — movement applied to elements the page already has
  floatHeadings,

  // cursor — follows the pointer
  spotlight,
  cursorTrail,
];

export {
  bubbles,
  colorWash,
  confettiRain,
  cursorTrail,
  filmGrain,
  fireflies,
  floatHeadings,
  glitchInk,
  gradientInk,
  gridWarp,
  inkAndPaper,
  lavaLamp,
  monoTint,
  neonInk,
  outlineInk,
  riverPath,
  scanlines,
  scenery,
  sharpChrome,
  sizeShift,
  snowfall,
  softChrome,
  spotlight,
  starfield,
  stickerChrome,
  toneShuffle,
  typeSwap,
  vignette,
};
