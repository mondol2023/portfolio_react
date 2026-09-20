/**
 * The page's own measurements, which the scene has to compose around.
 *
 * The DOM content column is opaque (or near enough) and the canvas sits behind
 * it at `z-index: -8`, so every part of the scene that lands inside that column
 * is simply not in the composition. Phase 12 answered this by placing objects
 * in *screen fractions* derived from the real layout constants rather than in
 * world space, and Act II keeps the method for every new object.
 *
 * It lives here rather than in a section's own object file because two
 * corridors now need the identical arithmetic — Projects' gallery walls and
 * Experience's stations — and a second copy of `CONTENT_MAX_PX` is exactly the
 * drift this module exists to prevent.
 */

/** The `container-page` max-width, in CSS pixels (76rem). */
export const CONTENT_MAX_PX = 1216;
/** Its inner padding at the widest breakpoint (2.5rem). */
export const CONTENT_PAD_PX = 40;

/**
 * The fraction of the viewport half-width the text column occupies.
 *
 * Floored at 0.4 so a freakishly wide window cannot hand the scene the entire
 * frame and let it walk into the reading area from the outside.
 */
export function contentSafeFraction(viewportWidth: number): number {
  const halfPx = Math.max(1, viewportWidth / 2);
  const contentHalfPx =
    Math.min(halfPx, CONTENT_MAX_PX / 2) - Math.min(CONTENT_PAD_PX, viewportWidth * 0.05);
  return Math.min(1, Math.max(0.4, contentHalfPx / halfPx));
}

/** Width of one gutter, in CSS pixels — the space the scene actually owns. */
export function gutterPixels(viewportWidth: number): number {
  const halfPx = Math.max(1, viewportWidth / 2);
  return (1 - contentSafeFraction(viewportWidth)) * halfPx;
}

/** The hero's own text block max-width (`max-w-4xl`), in CSS pixels. */
export const HERO_COLUMN_MAX_PX = 896;

/**
 * Where the hero's text column ends, as a signed fraction of the viewport's
 * half-width (`-1` = left edge, `0` = centre, `1` = right edge).
 *
 * `contentSafeFraction` models a *centred* column and so describes both
 * gutters at once. Hero's block is narrower than the container and
 * left-aligned inside it, which means its free space is entirely on one side
 * and is not the symmetric gutter the other sections compose into. The hero
 * sculpture needs that one asymmetric edge, not an average of two.
 */
export function heroColumnRightFraction(viewportWidth: number): number {
  // R3F reports a size of 0 on the frame before the canvas is measured, and
  // under `frameloop="demand"` (reduced motion) nothing re-renders until the
  // reader scrolls — so that one frame is what they look at. Answering it
  // honestly (`-1`, i.e. "the column ends at the left edge") would hand the
  // caller a full-width gutter and park the sculpture centre-screen at full
  // size, over the headline. An unmeasured viewport is not a wide one: fall to
  // the narrow-page answer, which composes quietly.
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 1;

  const halfPx = Math.max(1, viewportWidth / 2);
  const pad = Math.min(CONTENT_PAD_PX, viewportWidth * 0.05);
  const containerLeft = Math.max(0, (viewportWidth - CONTENT_MAX_PX) / 2) + pad;
  const columnWidth = Math.min(HERO_COLUMN_MAX_PX, Math.max(0, viewportWidth - containerLeft * 2));
  return Math.min(1, (containerLeft + columnWidth - halfPx) / halfPx);
}
