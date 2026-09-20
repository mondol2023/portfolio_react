/**
 * Phase L Part 8 — the interaction-state probe.
 *
 * Everything measured here is a DOM fact produced by CPU-side raycast maths,
 * not by the rasterizer, so it stays true under SwiftShader where every
 * wall-clock figure in this directory is meaningless.
 *
 *   found        — a viewport point where the ray actually lands on a drifter,
 *                  discovered by sweeping a grid until `.scene-grabbable`
 *                  appears. Before Part 8 no cursor state existed at all, so a
 *                  hit here is the whole of "hover is reachable".
 *   grabCursor   — computed `cursor` on <body> at that point. Must be `grab`.
 *   linkCursor   — computed `cursor` on a nav link while grabbable is set.
 *                  Must stay `pointer`: the class is on <body> only, so a
 *                  drifter passing behind a link must not steal its cursor.
 *   dragCursor   — computed `cursor` during a press at the same point.
 *   suspended    — whether the hover class clears while the page is being
 *                  flicked. This is §6.2's scroll gate, the one line the spec
 *                  calls the most important in the raycaster.
 *   released     — whether the class comes back once the flick has settled,
 *                  i.e. the gate suspends rather than latches.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SETTLE = Number(process.env.SETTLE ?? 20000);
/**
 * Dwell per sample point. The hover ray is gated to every other frame, and a
 * SwiftShader frame costs ~250ms here, so anything under ~500ms can miss a
 * genuine hit — which reads as "hover is broken" and is not.
 */
const HOVER_DWELL = Number(process.env.DWELL ?? 800);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("portfolio:scenery", "atelier");
    localStorage.setItem("theme", "dark");
  } catch {}
});
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 120000 });
await page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, { timeout: 120000 });
await page.waitForTimeout(SETTLE);

const grabbable = () => page.evaluate(() => document.body.classList.contains("scene-grabbable"));

/**
 * `LANES` from `scene-drifters.ts`, as viewport rows. A drifter's local
 * position is an exact screen fraction by construction (the group copies the
 * camera transform), so `laneY` maps straight to `h/2 * (1 - laneY)` whatever
 * the rig does to the lens — no guessing, and no sweeping the whole frame.
 * `x` still has to be swept: the lanes travel.
 */
const LANES = [0.6, -0.52, 0.88, -0.8, 0.34, -0.36, 0.95, -0.68];
const rows = LANES.map((lane) => Math.round(450 * (1 - lane)));

/**
 * Finds a point where the hover lands, skipping any that sits over a link or
 * a field: `usePointerPress` clears `grabAllowed` there, so a press at such a
 * point is *correctly* ignored and would read as a broken drag. The lanes
 * travel, so this is re-run rather than cached whenever a point is needed.
 */
async function sweep() {
  for (const y of rows) {
    for (let x = 40; x <= 1400; x += 40) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(HOVER_DWELL);
      if (!(await grabbable())) continue;
      const onPage = await page.evaluate(
        ([px, py]) => !!document.elementFromPoint(px, py)?.closest('a, button, input, textarea, select, label'),
        [x, y],
      );
      if (!onPage) return { x, y };
    }
  }
  return null;
}

const found = await sweep();

const result = { found };

if (found) {
  result.grabCursor = await page.evaluate(() => getComputedStyle(document.body).cursor);
  result.linkCursor = await page.evaluate(() => {
    const link = document.querySelector("header a");
    return link ? getComputedStyle(link).cursor : null;
  });

  await page.mouse.down();
  await page.waitForTimeout(HOVER_DWELL);
  result.dragCursor = await page.evaluate(() => getComputedStyle(document.body).cursor);
  await page.mouse.up();
  await page.waitForTimeout(HOVER_DWELL);

  // Flick without moving the cursor: the ray is still on the drifter, only
  // the scroll speed changed, so a cleared class can only be the gate.
  await page.mouse.move(found.x, found.y);
  await page.waitForTimeout(HOVER_DWELL);
  const before = await grabbable();
  await page.evaluate(() => window.scrollBy({ top: 2400, behavior: "smooth" }));
  await page.waitForTimeout(400);
  result.suspended = before && !(await grabbable());
  // Re-swept, not re-hovered at the same point: the lanes travel, so the
  // drifter that was under the cursor before the flick has moved on. The
  // question is whether the gate suspends or latches, and only a fresh hit
  // answers that.
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(SETTLE);
  result.released = (await sweep()) !== null;
}

console.log(JSON.stringify(result, null, 2));
await browser.close();
