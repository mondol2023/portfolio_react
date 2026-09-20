// Throwaway: which region of the canvas differs across a scroll round-trip.
import { chromium } from "playwright";

const SETTLE = Number(process.env.SETTLE ?? 20000);
const SCENERY = process.env.SCENERY ?? "observatory";
const SECTION = process.env.SECTION ?? "home";

function instrument() {
  const state = { gl: null, snap: null };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const gl = /webgl/i.test(type);
    const ctx = getContext.call(this, type, gl ? { ...(attrs ?? {}), preserveDrawingBuffer: true } : attrs);
    if (ctx && gl) state.gl = ctx;
    return ctx;
  };
  const read = () => {
    const gl = state.gl;
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { px, w, h };
  };
  window.__snap = () => { state.snap = read(); return { w: state.snap.w, h: state.snap.h }; };
  window.__diff = (eps) => { window.__eps = eps;
    const a = state.snap, b = read();
    const cols = 16, rows = 9;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
    let n = 0, maxDelta = 0;
    for (let y = 0; y < b.h; y += 1) {
      for (let x = 0; x < b.w; x += 1) {
        const i = (y * b.w + x) * 4;
        const d = Math.max(
          Math.abs(a.px[i] - b.px[i]),
          Math.abs(a.px[i + 1] - b.px[i + 1]),
          Math.abs(a.px[i + 2] - b.px[i + 2]),
          Math.abs(a.px[i + 3] - b.px[i + 3]),
        );
        if (d > (Number(window.__eps) || 0)) {
          n += 1;
          if (d > maxDelta) maxDelta = d;
          // readPixels is bottom-up; flip so the grid reads like the screen.
          grid[Math.min(rows - 1, Math.floor(((b.h - 1 - y) / b.h) * rows))][Math.min(cols - 1, Math.floor((x / b.w) * cols))] += 1;
        }
      }
    }
    return { n, maxDelta, w: b.w, h: b.h, grid };
  };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
await ctx.addInitScript(instrument);
await ctx.addInitScript((s) => { try { localStorage.setItem("portfolio:scenery", s); localStorage.setItem("theme", "dark"); } catch {} }, SCENERY);
const page = await ctx.newPage();
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 120000 });
await page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, { timeout: 120000 });
await page.waitForFunction((s) => document.documentElement.dataset.scenery === s, SCENERY, { timeout: 30000 }).catch(() => {});
await page.mouse.move(2, 2);

const y = await page.evaluate((id) => {
  const el = document.getElementById(id);
  const r = el.getBoundingClientRect();
  return Math.max(0, Math.round(window.scrollY + r.top + r.height / 2 - window.innerHeight / 2));
}, SECTION);

await page.evaluate((to) => window.scrollTo(0, to), y);
await page.waitForTimeout(SETTLE);
console.log("size", await page.evaluate(() => window.__snap()));

await page.evaluate((to) => window.scrollTo(0, to + 900), y);
await page.waitForTimeout(Math.round(SETTLE / 2));
await page.evaluate((to) => window.scrollTo(0, to), y);
await page.waitForTimeout(SETTLE);

const d = await page.evaluate(() => window.__diff(0));
console.log(`scenery=${SCENERY} section=${SECTION} y=${y} differing px=${d.n} maxDelta=${d.maxDelta}`);
for (const row of d.grid) console.log(row.map((v) => (v ? String(Math.min(99999, v)).padStart(6) : "     .")).join(""));
await browser.close();
