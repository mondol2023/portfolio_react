/**
 * Phase L Part 10 — the reduced-motion still pose, measured rather than eyeballed.
 *
 * The contract reduced motion actually makes is stronger than "slower", and
 * it is testable: **the scene becomes a pure function of scroll position.**
 * Nothing may advance on a clock, so
 *
 *   1. at rest the canvas issues zero draw calls, and
 *   2. returning to a scroll position must reproduce that position's frame
 *      exactly.
 *
 * Both are read from the GL context itself — a draw-call counter and a
 * `readPixels` comparison — so neither depends on wall-clock timing, which is
 * the one thing this sandbox cannot measure (CODEBASE_MAP.md §8). A frozen
 * clock and a merely slow one are indistinguishable by stopwatch and
 * trivially different here.
 *
 * The comparison is per-pixel at `EPS` (2/255 per channel), *not* a hash.
 * SwiftShader is not bit-reproducible: a genuinely still observatory frame
 * measured here still moved one pixel by one LSB, which an equality test
 * reports as a defect. Real motion moves five to six figures of pixels — the
 * control cell prints the contrast in every run.
 *
 * Why (2) is not redundant with (1): `frameloop` is `"demand"` under reduced
 * motion, so an unguarded `sceneTime.elapsed` read draws nothing at rest and
 * then *teleports* the moment a scroll wakes the renderer. That defect passes
 * (1) and fails (2), and it is exactly what Part 10 found in `lighting.tsx`'s
 * key orbit.
 *
 * The last cell is a deliberate control with reduced motion off. It must fail
 * both probes. A run where the control passes is measuring nothing — the same
 * false-pass trap `switch-interrupt.mjs` exists to avoid.
 *
 * Screenshots go to `out/reduced-motion/` for the half no probe can answer:
 * whether the still pose looks considered (a vine fully grown, not frozen
 * mid-draw). That judgment is a P1 and it is a human's.
 *
 *   BASE      :3000            SETTLE   20000ms (~2000 on a real GPU)
 *   DWELL     4000ms           SECTIONS home,skills,projects
 *   SCENERIES all four         THEME    dark (motion is theme-independent)
 *   EPS       2
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SETTLE = Number(process.env.SETTLE ?? 20000);
const DWELL = Number(process.env.DWELL ?? 4000);
/** Per-channel tolerance. SwiftShader is not bit-reproducible; motion is not 1 LSB. */
const EPS = Number(process.env.EPS ?? 2);
const SHOTS = process.env.SHOTS ?? "scripts/phase-l/out/reduced-motion";
const SCENERIES = (process.env.SCENERIES ?? "atelier,observatory,garden,blueprint").split(",");
const SECTIONS = (process.env.SECTIONS ?? "home,skills,projects").split(",");
const THEME = process.env.THEME ?? "dark";

/**
 * Installed before any page script. Forces `preserveDrawingBuffer` so
 * `readPixels` is valid at rest — with it off the back buffer is undefined
 * after present, and every sample would hash the same garbage.
 */
function instrument() {
  const state = { draws: 0, gl: null };
  const isGl = (type) => /webgl/i.test(type);

  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const next = isGl(type) ? { ...(attrs ?? {}), preserveDrawingBuffer: true } : attrs;
    const ctx = getContext.call(this, type, next);
    if (ctx && isGl(type)) state.gl = ctx;
    return ctx;
  };

  for (const Ctor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Ctor) continue;
    for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
      const original = Ctor.prototype[name];
      if (!original) continue;
      Ctor.prototype[name] = function (...args) {
        state.draws += 1;
        return original.apply(this, args);
      };
    }
  }

  const read = () => {
    const gl = state.gl;
    if (!gl) return null;
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { px, w, h };
  };

  window.__draws = () => state.draws;
  /** Latches the reference frame. `ink` guards against measuring a blank buffer. */
  window.__snap = () => {
    state.snap = read();
    if (!state.snap) return null;
    let ink = 0;
    for (let i = 0; i < state.snap.px.length; i += 1) if (state.snap.px[i]) ink += 1;
    return { ink, w: state.snap.w, h: state.snap.h };
  };
  /**
   * Pixels differing from the reference by more than `eps`, per channel.
   * Not an exact hash: a software rasterizer is not bit-reproducible, and
   * measured here a genuinely still observatory frame still moved one pixel
   * by one LSB — enough to fail an equality test and nothing else.
   */
  window.__diff = (eps) => {
    const a = state.snap;
    const b = read();
    if (!a || !b || a.w !== b.w || a.h !== b.h) return null;
    let changed = 0;
    let maxDelta = 0;
    for (let i = 0; i < b.px.length; i += 1) {
      const d = Math.abs(a.px[i] - b.px[i]);
      if (d > maxDelta) maxDelta = d;
      if (d > eps) changed += 1;
    }
    return { changed, maxDelta };
  };
}

/** Viewport-centre scroll offset of a section, as an absolute page y. */
function centreOf(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return Math.max(0, Math.round(window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2));
}

const quiet = (page) =>
  page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, { timeout: 120000 });

await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();
const rows = [];

const CELLS = [
  ...SCENERIES.map((scenery) => ({ scenery, reduced: true })),
  // Control: same page, motion allowed. Must fail everything below.
  { scenery: SCENERIES[0], reduced: false },
];

for (const cell of CELLS) {
  const label = `${cell.scenery}${cell.reduced ? "" : " (control, motion on)"}`;
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: THEME,
    reducedMotion: cell.reduced ? "reduce" : "no-preference",
  });
  await ctx.addInitScript(instrument);
  await ctx.addInitScript(
    ([s, t]) => {
      try {
        localStorage.setItem("portfolio:scenery", s);
        localStorage.setItem("theme", t);
      } catch {}
    },
    [cell.scenery, THEME],
  );

  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 120000 });
  await quiet(page);
  // S2: the stored scenery lands in a post-mount effect, so the attribute is
  // still `atelier` for a moment after the canvas exists.
  await page
    .waitForFunction((s) => document.documentElement.dataset.scenery === s, cell.scenery, { timeout: 30000 })
    .catch(() => {});

  const applied = await page.evaluate(() => document.documentElement.dataset.scenery);
  if (applied !== cell.scenery) {
    console.log(`  !! ${label} booted as ${applied} — skipped`);
    await ctx.close();
    continue;
  }

  // The pointer must not be over the canvas: a hover is a legitimate reason
  // for a frame to differ, and it is not the one under test.
  await page.mouse.move(2, 2);
  console.log(`\n${label}`);

  for (const id of SECTIONS) {
    const y = await page.evaluate(centreOf, id);
    if (y === null) {
      console.log(`  ${id.padEnd(10)} absent — skipped`);
      continue;
    }

    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(SETTLE);
    await quiet(page);

    const before = await page.evaluate(() => window.__draws());
    const reference = await page.evaluate(() => window.__snap());

    // Probe 1 — at rest, untouched.
    await page.waitForTimeout(DWELL);
    const idleDraws = (await page.evaluate(() => window.__draws())) - before;
    const atRest = await page.evaluate((e) => window.__diff(e), EPS);

    // Probe 2 — leave the position and come back to exactly it.
    await page.evaluate((to) => window.scrollTo(0, to + 900), y);
    await page.waitForTimeout(Math.round(SETTLE / 2));
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(SETTLE);
    await quiet(page);

    const landed = await page.evaluate(() => Math.round(window.scrollY));
    const onReturn = await page.evaluate((e) => window.__diff(e), EPS);
    await page.screenshot({ path: `${SHOTS}/${cell.scenery}-${cell.reduced ? "reduced" : "control"}-${id}.png` });

    const ink = reference?.ink ?? 0;
    const row = {
      cell: label,
      section: id,
      reduced: cell.reduced,
      idleDraws,
      // A clamped landing makes the comparison meaningless — reported as
      // inconclusive, never as a pass.
      returned: landed === y,
      atRest: atRest?.changed ?? null,
      onReturn: onReturn?.changed ?? null,
      blank: ink === 0,
    };
    row.still = row.idleDraws === 0 && row.atRest === 0 && row.onReturn === 0;
    rows.push(row);

    const verdict = row.blank
      ? "NO DATA (blank buffer)"
      : !row.returned
        ? `INCONCLUSIVE (landed ${landed}, wanted ${y})`
        : cell.reduced
          ? row.still
            ? "PASS"
            : "FAIL"
          : row.still
            ? "CONTROL DID NOT MOVE"
            : "control ok (motion detected)";

    console.log(
      `  ${id.padEnd(10)} ${verdict.padEnd(30)} idle draws ${String(idleDraws).padStart(5)}  ` +
        `rest ${String(row.atRest).padStart(7)}px  return ${String(row.onReturn).padStart(7)}px  ` +
        `worst delta ${onReturn?.maxDelta ?? "?"}  ink ${ink}`,
    );
  }

  // The DOM half of the same rule: §7's aura and the ambient backdrop's own
  // CSS loops. Cheap, and computed styles stay true under SwiftShader.
  const dom = await page.evaluate(() => {
    const names = (sel) =>
      [...document.querySelectorAll(sel)].map((el) => getComputedStyle(el).animationName).join(",") || "(none)";
    return {
      // `CursorAura` returns null when it is not active, so presence is the test.
      aura: document.querySelector(".cursor-aura-layer") !== null,
      ambient: names(".ambient-blob, .ambient-rays, .ambient-stars"),
      marquee: names(".marquee-track"),
    };
  });
  console.log(`  dom        aura=${dom.aura} ambient=${dom.ambient} marquee=${dom.marquee}`);

  await ctx.close();
}

await browser.close();

console.log(`\n${"=".repeat(72)}`);
const measured = rows.filter((r) => !r.blank && r.returned);
const control = measured.filter((r) => !r.reduced);
const failures = measured.filter((r) => r.reduced && !r.still);
const skipped = rows.filter((r) => r.blank || !r.returned);

if (skipped.length) {
  const list = skipped.map((r) => `${r.cell}/${r.section}`).join(", ");
  console.log(`Inconclusive, re-run before believing the rest: ${list}\n`);
}
if (control.length && control.every((r) => r.still)) {
  console.log("!! The motion-on control was also still. The harness is measuring nothing — fix it before reading a PASS.\n");
}
if (failures.length === 0 && measured.some((r) => r.reduced)) {
  console.log("PASS — every scenery is a pure function of scroll under reduced motion.");
} else {
  for (const f of failures) {
    const why = [
      f.idleDraws > 0 ? `${f.idleDraws} draw calls at rest` : null,
      f.atRest ? `${f.atRest}px changed at rest` : null,
      f.onReturn ? `${f.onReturn}px changed across a scroll round-trip` : null,
    ].filter(Boolean);
    console.log(`  ${f.cell}/${f.section}: ${why.join("; ")}`);
  }
}
process.exitCode = failures.length === 0 ? 0 : 1;
