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
