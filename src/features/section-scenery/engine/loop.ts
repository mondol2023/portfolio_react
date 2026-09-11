import { createInputTracker, type FrameInput } from "./input";
import { clamp01, easeOutCubic, smoothstep01 } from "./math";
import type { Scene, SceneFactory, SceneFrame } from "./scene";
import type { TonePalette } from "./tone-color";

/**
 * The one render loop.
 *
 * Every section shares it. Scenes come and go; the canvas, the context, the
 * sizing, the reader's pointer and the frame budget are set up once and never
 * torn down until the component unmounts. That is the "one engine, many
 * parameter sets" idea taken from schemeengine.com — the expensive part is built
 * a single time, and moving between sections is a swap of what gets drawn, not
 * a re-mount.
 */

/** A tab that was backgrounded for a minute must not hand the next frame a 60s
 *  `dt` and teleport every particle off screen. */
const MAX_DT = 0.05;
/**
 * How much of the newly measured frame time to believe.
 *
 * `requestAnimationFrame` does not arrive on a metronome — a 60Hz display
 * delivers 15ms and 18ms gaps next to each other all day. Integrating that
 * directly is a visible tremor on slow, wide motion, which is most of what this
 * feature draws. Blending a third of each new measurement keeps the clock honest
 * over a second while taking the jitter out of any one frame.
 */
const DT_BLEND = 0.35;

/** How long an outgoing scene lingers while the new one arrives. Deliberately
 *  shorter than the 900ms `--tone` transition in `globals.css`, so the canvas
 *  has settled by the time the CSS wash finishes and the two do not appear to
 *  race each other. */
const FADE_SECONDS = 0.7;
/** The arrival beat. Long enough to read as a movement rather than a pop. */
const INTRO_SECONDS = 1.3;

/** Roughly two thirds of a 60fps frame. Above this the scene is taking more of
 *  the budget than a background has any business taking. */
const COST_BUDGET_MS = 11;
const COST_SAMPLES = 90;
const MIN_QUALITY = 0.5;

export interface SceneLoop {
  /** Make `factory`'s scene current, cross-fading from whatever is there. */
  show(factory: SceneFactory, palette: TonePalette): void;
  /** Same scene, new colours — a theme flip. */
  retint(palette: TonePalette): void;
  /**
   * Lowers the resolution budget, same as the frame-cost sampler's own step —
   * in fact the same one, just driven by a viewport/device tier crossing
   * rather than a measured average. Never raises it: a visitor who resizes
   * back up to a roomier tier does not get the sharpening back, for the same
   * reason `sampleCost` doesn't climb back — a value that could go either way
   * would oscillate.
   */
  setQuality(next: number): void;
  stop(): void;
}

interface Live {
  scene: Scene;
  factory: SceneFactory;
  palette: TonePalette;
  /** Seconds since this scene became current. */
  age: number;
}

/**
 * Returns `null` when a 2D context cannot be had — an old browser, a blocked
 * canvas, too many live contexts on the page. The caller stands down and the
 * reader simply gets the CSS ambient layer, which was never removed.
 */
export function createSceneLoop(
  canvas: HTMLCanvasElement,
  options: { initialQuality?: number } = {},
): SceneLoop | null {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  // Rebound after the guard: the helpers below are hoisted function
  // declarations, and TypeScript will not carry a narrowing into one of those.
  const ctx = context;

  const input = createInputTracker();

  let width = 0;
  let height = 0;
  let pending: { width: number; height: number } | null = null;

  // The caller's starting budget (a viewport/device tier), clamped to the
  // same floor the runtime sampler below respects. Defaults to 1 — today's
  // unchanged behaviour for anyone who doesn't pass one.
  let quality = Math.min(1, Math.max(MIN_QUALITY, options.initialQuality ?? 1));
  let costTotal = 0;
  let costCount = 0;

  let current: Live | null = null;
  let outgoing: Live | null = null;
  /** Counts up to `FADE_SECONDS` while `outgoing` is still on screen. */
  let fade = 0;

  let raf = 0;
  let last = 0;
  let smoothDt = 0;
  let stopped = false;

  function applySize(nextWidth: number, nextHeight: number) {
    width = nextWidth;
    height = nextHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));

    // Scenes draw in CSS pixels and never learn about the ratio.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    current?.scene.resize(width, height);
    outgoing?.scene.resize(width, height);
  }

  /**
   * Drops one quality step when the average frame cost runs over budget.
   *
   * Quality only ever falls. A loop that also raised it would find the cheaper
   * render comfortably under budget, climb back, go over, and oscillate — the
   * reader would see the background sharpen and soften forever.
   */
  function sampleCost(ms: number) {
    if (quality <= MIN_QUALITY) return;
    costTotal += ms;
    costCount += 1;
    if (costCount < COST_SAMPLES) return;

    const average = costTotal / costCount;
    costTotal = 0;
    costCount = 0;
    if (average <= COST_BUDGET_MS) return;

    quality = Math.max(MIN_QUALITY, quality - 0.25);
    applySize(width, height);
  }

  function draw(live: Live, dt: number, alpha: number, io: FrameInput) {
    const frame: SceneFrame = {
      ctx,
      width,
      height,
      dt,
      t: live.age,
      intro: easeOutCubic(clamp01(live.age / INTRO_SECONDS)),
      palette: live.palette,
      pointer: io.pointer,
      scroll: io.scroll,
    };

    ctx.save();
    ctx.globalAlpha = alpha;
    live.scene.frame(frame);
    ctx.restore();
  }

  function tick(now: number) {
    raf = 0;
    if (stopped) return;

    if (pending) {
      const { width: w, height: h } = pending;
      pending = null;
      applySize(w, h);
    }

    const started = performance.now();
    const measured = Math.min(MAX_DT, last === 0 ? 1 / 60 : (now - last) / 1000);
    last = now;
    smoothDt = smoothDt === 0 ? measured : smoothDt + (measured - smoothDt) * DT_BLEND;
    const dt = smoothDt;

    // Advanced once per frame, before anything draws: both live scenes must see
    // the same reader in the same place, or the cross-fade shows two of them.
    const io = input.read(dt, width, height);

    ctx.clearRect(0, 0, width, height);

    if (outgoing) {
      fade += dt;
      outgoing.age += dt;
      const progress = clamp01(fade / FADE_SECONDS);
      if (progress >= 1) {
        outgoing = null;
      } else {
        draw(outgoing, dt, 1 - smoothstep01(progress), io);
      }
    }

    if (current) {
      current.age += dt;
      // `smoothstep01(p) + smoothstep01(1 - p) === 1`, so the pair always sums to
      // full opacity: the canvas neither dips toward empty nor bulges bright in
      // the middle of a section change, which both an ease-out pair and a linear
      // one do in their own direction.
      const rising = outgoing ? smoothstep01(clamp01(fade / FADE_SECONDS)) : 1;
      draw(current, dt, rising, io);
    }

    sampleCost(performance.now() - started);
    schedule();
  }

  function schedule() {
    if (stopped || raf !== 0 || document.hidden) return;
    raf = requestAnimationFrame(tick);
  }

  function onVisibility() {
    if (document.hidden) {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      return;
    }
    // The clock restarts rather than resuming: `now - last` across a hidden
    // stretch is minutes wide, and clamping it to MAX_DT would still burn a
    // frame's worth of motion for no reason. The smoothed clock is dropped with
    // it so the first frame back is not blended against a minute-old average.
    last = 0;
    smoothDt = 0;
    schedule();
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const box = entry.contentRect;
    // Applied at the top of the next frame — resizing a canvas clears it, and
    // doing that mid-observer would show a blank flash on a drag-resize.
    pending = { width: Math.max(1, box.width), height: Math.max(1, box.height) };
    schedule();
  });

  observer.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);

  applySize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
  schedule();

  return {
    show(factory, palette) {
      if (current?.factory === factory) {
        // Same section — a scroll wobble, not a move. Keep the scene running and
        // just make sure its colours are current.
        current.palette = palette;
        return;
      }

      // A fast scroll through several sections must not stack fades. The scene
      // that was already leaving is dropped outright; only the most recent pair
      // is ever on screen.
      outgoing = current;
      fade = 0;

      const scene = factory();
      scene.resize(width, height);
      current = { scene, factory, palette, age: 0 };
      schedule();
    },

    retint(palette) {
      if (current) current.palette = palette;
      if (outgoing) outgoing.palette = palette;
    },

    setQuality(next) {
      const clamped = Math.min(1, Math.max(MIN_QUALITY, next));
      if (clamped >= quality) return;
      quality = clamped;
      applySize(width, height);
    },

    stop() {
      stopped = true;
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      input.stop();
      current = null;
      outgoing = null;
    },
  };
}
