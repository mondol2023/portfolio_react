import type Lenis from "lenis";

/**
 * Module-level handle on the root Lenis instance.
 *
 * A registry rather than context because the consumers are plain functions, not
 * components: `scrollToSection` is called from a click handler in the desktop
 * dock and has no hook position to read context from. There is exactly one root
 * instance for the whole app, so a module binding models it honestly.
 */

let instance: Lenis | null = null;

export function registerLenis(lenis: Lenis | null): void {
  instance = lenis;
}

/** Null when Lenis is not mounted — under reduced motion, or outside the site shell. */
export function getLenis(): Lenis | null {
  return instance;
}
