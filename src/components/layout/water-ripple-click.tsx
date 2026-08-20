"use client";

import { useEffect } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Elements a click can "belong to" — if the click lands on (or inside) any of
 * these, it's real UI interaction, not empty space, so no ripple fires.
 * `[data-no-ripple]` is the escape hatch for anything that has a click
 * handler but doesn't naturally match the list above (e.g. a backdrop div).
 */
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "summary",
  "[role]",
  "[tabindex]",
  "[contenteditable='true']",
  "[data-no-ripple]",
].join(", ");

const LAYER_ID = "water-ripple-layer";
const DEFS_ID = "water-ripple-defs";

/*
 * The whole effect is a lens, not a sticker: a full-viewport div runs
 * `backdrop-filter: url(#filter)` against an SVG filter that displaces the
 * pixels already behind it, so it never adds color — it only bends whatever
 * is already on screen, the same way a real water surface refracts light
 * without tinting it.
 *
 * The filter's displacement map is a small texture computed once (below):
 * for every texel, its direction points radially away from the texture's
 * center, and its magnitude follows a single windowed sine wavelet crossing
 * zero at the ring's center line — magnifying content on the ring's outer
 * (leading) edge and shrinking it on the inner (trailing) edge, the same
 * "larger at the crest, smaller at the trough" cross-section a real ripple
 * has. Growing the texture outward via `feImage`'s width/height each frame
 * is what makes that one ring travel outward from the click point.
 */
const TEXTURE_SIZE = 220;
const RING_RADIUS_NORM = 0.55;
const RING_HALF_WIDTH_NORM = 0.42;
/** Flip to swap which side of the ring magnifies vs. shrinks. */
const RING_POLARITY = -1;

let cachedTextureUrl: string | null = null;

/** Builds (once, memoized) the radial displacement texture described above. */
function getDisplacementTexture(): string {
  if (cachedTextureUrl) return cachedTextureUrl;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const half = TEXTURE_SIZE / 2;
  const image = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const data = image.data;

  for (let py = 0; py < TEXTURE_SIZE; py++) {
    for (let px = 0; px < TEXTURE_SIZE; px++) {
      const nx = (px + 0.5 - half) / half;
      const ny = (py + 0.5 - half) / half;
      const r = Math.hypot(nx, ny);
      const ux = r > 0.0001 ? nx / r : 0;
      const uy = r > 0.0001 ? ny / r : 0;

      // A single windowed sine wavelet centered on RING_RADIUS_NORM: zero at
      // the band's inner/outer edges and at its exact center line, rising to
      // a push on either side — a smooth crest-to-trough cross-section
      // rather than a hard-edged ring.
      const t = (r - RING_RADIUS_NORM) / RING_HALF_WIDTH_NORM;
      let wave = 0;
      if (t > -1 && t < 1) {
        const window = 0.5 - 0.5 * Math.cos((t + 1) * Math.PI); // Hann window: 0 → 1 → 0
        wave = RING_POLARITY * Math.sin(t * Math.PI) * window;
      }

      const i = (py * TEXTURE_SIZE + px) * 4;
      data[i] = Math.max(0, Math.min(255, 128 + wave * ux * 127));
      data[i + 1] = Math.max(0, Math.min(255, 128 + wave * uy * 127));
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  cachedTextureUrl = canvas.toDataURL("image/png");
  return cachedTextureUrl;
}

/** Basic feature check — skips the effect entirely rather than showing a broken/flat one. */
function supportsBackdropFilter(): boolean {
  return (
    typeof CSS !== "undefined" &&
    (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"))
  );
}

interface RippleInstance {
  filter: SVGFilterElement;
  feImage: SVGFEImageElement;
  feDisplacementMap: SVGFEDisplacementMapElement;
  wrapper: HTMLDivElement;
  x: number;
  y: number;
  startedAt: number;
  durationMs: number;
  maxReach: number;
  peakScale: number;
}

const active = new Set<RippleInstance>();
let rafId: number | null = null;

function getLayer(): HTMLDivElement {
  const existing = document.getElementById(LAYER_ID);
  if (existing instanceof HTMLDivElement) return existing;

  const layer = document.createElement("div");
  layer.id = LAYER_ID;
  layer.className = "water-ripple-layer";
  document.body.appendChild(layer);
  return layer;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function getDefs(): SVGDefsElement {
  const existing = document.getElementById(DEFS_ID);
  if (existing instanceof SVGDefsElement) return existing;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";

  const defs = document.createElementNS(SVG_NS, "defs");
  defs.id = DEFS_ID;
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

/** Distance from (x, y) to the farthest viewport corner — how far the ring must travel to reach every edge of the screen. */
function reachDistance(x: number, y: number): number {
  const dx = Math.max(x, window.innerWidth - x);
  const dy = Math.max(y, window.innerHeight - y);
  return Math.hypot(dx, dy);
}

/** World-space ring radius = RING_RADIUS_NORM * (mapSize / 2) — inverted to size the texture for a target reach. */
function mapSizeForReach(reach: number): number {
  return reach / (RING_RADIUS_NORM / 2);
}

/** Fast rise, slow settle — soft rather than an abrupt on/off. */
function amplitudeEnvelope(progress: number): number {
  if (progress < 0.12) return progress / 0.12;
  const decay = (progress - 0.12) / 0.88;
  return Math.pow(1 - decay, 1.7);
}

/** Decelerating spread — the ring travels fastest right after impact and eases into place. */
function spreadEnvelope(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function tick() {
  const now = performance.now();

  for (const instance of active) {
    const progress = Math.min(1, (now - instance.startedAt) / instance.durationMs);
    const reach = Math.max(8, instance.maxReach * spreadEnvelope(progress));
    const size = mapSizeForReach(reach);

    instance.feImage.setAttribute("x", `${instance.x - size / 2}`);
    instance.feImage.setAttribute("y", `${instance.y - size / 2}`);
    instance.feImage.setAttribute("width", `${size}`);
    instance.feImage.setAttribute("height", `${size}`);
    instance.feDisplacementMap.setAttribute(
      "scale",
      `${instance.peakScale * amplitudeEnvelope(progress)}`,
    );

    if (progress >= 1) {
      instance.wrapper.remove();
      instance.filter.remove();
      active.delete(instance);
    }
  }

  if (active.size > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
  }
}

function spawnRipple(x: number, y: number, reduceMotion: boolean) {
  const texture = getDisplacementTexture();
  if (!texture) return;

  const maxReach = reduceMotion
    ? Math.min(70, reachDistance(x, y))
    : reachDistance(x, y);
  const durationMs = reduceMotion ? 380 : 1700;
  const peakScale = reduceMotion ? 14 : 46;

  const filterId = `water-ripple-filter-${Math.random().toString(36).slice(2)}`;
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.id = filterId;
  filter.setAttribute("x", "-60%");
  filter.setAttribute("y", "-60%");
  filter.setAttribute("width", "220%");
  filter.setAttribute("height", "220%");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const feImage = document.createElementNS(SVG_NS, "feImage");
  feImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", texture);
  feImage.setAttribute("href", texture);
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("width", "0");
  feImage.setAttribute("height", "0");
  feImage.setAttribute("result", "map");
  filter.appendChild(feImage);

  const feBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
  feBlur.setAttribute("in", "map");
  feBlur.setAttribute("stdDeviation", "1.5");
  feBlur.setAttribute("result", "mapBlur");
  filter.appendChild(feBlur);

  const feDisplacementMap = document.createElementNS(SVG_NS, "feDisplacementMap");
  feDisplacementMap.setAttribute("in", "SourceGraphic");
  feDisplacementMap.setAttribute("in2", "mapBlur");
  feDisplacementMap.setAttribute("xChannelSelector", "R");
  feDisplacementMap.setAttribute("yChannelSelector", "G");
  feDisplacementMap.setAttribute("scale", "0");
  filter.appendChild(feDisplacementMap);

  getDefs().appendChild(filter);

  const wrapper = document.createElement("div");
  wrapper.className = "water-ripple";
  wrapper.style.backdropFilter = `url(#${filterId})`;
  wrapper.style.setProperty("-webkit-backdrop-filter", `url(#${filterId})`);
  getLayer().appendChild(wrapper);

  active.add({
    filter,
    feImage,
    feDisplacementMap,
    wrapper,
    x,
    y,
    startedAt: performance.now(),
    durationMs,
    maxReach,
    peakScale,
  });

  if (rafId === null) rafId = requestAnimationFrame(tick);
}

/**
 * A permanent, always-on click interaction (not part of the surprise kit —
 * this never toggles off): clicking any part of the page that has no
 * clickable content of its own sends a ring of pure refraction outward from
 * that point, bending whatever is already on screen the way a real water
 * surface would — no added color, no fixed overlay, just the page's own
 * pixels pushed larger on the ring's leading edge and smaller on its
 * trailing edge as it travels out to every corner of the viewport.
 *
 * Renders nothing itself — it imperatively manages a shared SVG `<defs>` and
 * a full-viewport layer on `<body>`, spawning one `backdrop-filter` div (and
 * matching `<filter>`) per qualifying click, driven by `requestAnimationFrame`
 * since the filter's own attributes aren't CSS-animatable.
 */
export function WaterRippleClick() {
  const reduceMotion = useMotionPreference();

  useEffect(() => {
    if (!supportsBackdropFilter()) return;

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) return;

      const target = event.target;
      if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) return;

      // A click that ends a text-selection drag isn't "clicking empty space".
      const selection = window.getSelection();
      if (selection && selection.type === "Range" && !selection.isCollapsed) return;

      spawnRipple(event.clientX, event.clientY, reduceMotion);
    };

    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [reduceMotion]);

  // Layer/defs/in-flight ripples are shared across the whole page lifetime
  // deliberately, not torn down on unmount — this component only ever
  // mounts once per route group and outlives every navigation within it.

  return null;
}
