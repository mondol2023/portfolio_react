"use client";

import { useSyncExternalStore } from "react";

/**
 * Reads the host theme's tone colours so the world inherits the portfolio's
 * per-section tinting *without importing host code* — the only coupling is
 * the CSS custom properties the host already defines (`--tone`, `--tone-soft`,
 * `--accent`), which is data, not implementation.
 *
 * The snapshot is cached against `<html>`'s class attribute: the host flips
 * that attribute when the theme changes, so a class mutation is the exact
 * signal to re-read computed styles.
 */
export interface TonePalette {
  tone: string;
  toneSoft: string;
  accent: string;
}

/** Warm-amber defaults matching the host's `:root` tokens, used before mount. */
const FALLBACK: TonePalette = {
  tone: "#f97316",
  toneSoft: "#fdba74",
  accent: "#c2410c",
};

export function readTonePalette(): TonePalette {
  if (typeof window === "undefined") return FALLBACK;

  const styled = document.querySelector<HTMLElement>("[data-tone]") ?? document.documentElement;
  const styles = getComputedStyle(styled);

  return {
    tone: styles.getPropertyValue("--tone").trim() || FALLBACK.tone,
    toneSoft: styles.getPropertyValue("--tone-soft").trim() || FALLBACK.toneSoft,
    accent: styles.getPropertyValue("--accent").trim() || FALLBACK.accent,
  };
}

export { FALLBACK as FALLBACK_PALETTE };

let cached: TonePalette | null = null;
let cacheKey = "";

function htmlClassKey(): string {
  return typeof document === "undefined" ? "" : document.documentElement.className;
}

function getSnapshot(): TonePalette {
  const key = htmlClassKey();
  if (cached === null || key !== cacheKey) {
    cached = readTonePalette();
    cacheKey = key;
  }
  return cached;
}

function getServerSnapshot(): TonePalette {
  return FALLBACK;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useTonePalette(): TonePalette {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
