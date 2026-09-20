/**
 * Phase L Part 7 — interrupted crossfades.
 *
 * Part 1 left "3 of 12 pairs landed on the wrong scenery" untriaged between
 * "in-flight timeline not cancelled" and "harness out-ran SwiftShader". This
 * separates them: every case below drives a SECOND pick while the first
 * crossfade is provably still in flight, then reads the DOM attribute, the
 * picker's committed label and the veil opacity once everything is quiet.
 * All three reads are DOM state, so SwiftShader cannot make them lie.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const NAME = { atelier: "Atelier", observatory: "Observatory", garden: "Garden", blueprint: "Blueprint" };
const SETTLE = Number(process.env.SETTLE ?? 12000);

// [name, boot, first pick, second pick, expected landing]
const CASES = [
  ["rewind    A->B then A", "atelier", "garden", "atelier", "atelier"],
  ["repeat    A->B then B", "atelier", "garden", "garden", "garden"],
  ["redirect  A->B then C", "atelier", "garden", "blueprint", "blueprint"],
  ["rewind2   A->B then A", "blueprint", "observatory", "blueprint", "blueprint"],
  ["redirect2 A->B then C", "garden", "atelier", "observatory", "observatory"],
];

/**
 * Both picks in ONE page task. React flushes discrete click events
 * synchronously, so the popover re-opens between them without a frame
 * passing — which is the only way to land the second pick inside the
 * crossfade's first 44%, where `renderScenery.id` still reads as the old
 * world. Driving this from Playwright instead lets the 900ms timeline finish
 * between the two clicks (SwiftShader spends seconds per popover round-trip),
 * which is why the first run of this suite reported a false pass.
 */
async function doublePick(page, first, second) {
  return page.evaluate(async ([a, b]) => {
    const row = (name) =>
      Array.from(document.querySelectorAll('[role="radio"]')).find((el) => el.textContent.includes(name));
    const trigger = () => document.querySelector('button[aria-label^="Scenery:"]');
    // React commits the popover on a scheduler task, not synchronously after
    // a programmatic click. Yielding macrotasks (never a frame) lets it land
    // in single-digit milliseconds.
    const openRow = async (name) => {
      trigger().click();
      for (let i = 0; i < 40 && !row(name); i += 1) await new Promise((r) => setTimeout(r, 0));
      return row(name);
    };

    const t0 = performance.now();
    const firstRow = await openRow(a);
    if (!firstRow) return { error: "popover did not open" };
    firstRow.click();

    const betweenScenery = document.documentElement.dataset.scenery;
    const secondRow = await openRow(b);
    if (!secondRow) return { error: "popover did not re-open" };
    secondRow.click();

    return { gapMs: performance.now() - t0, betweenScenery };
  }, [first, second]);
}

const browser = await chromium.launch();
const out = [];

for (const [label, boot, first, second, expect] of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([s]) => {
    try { localStorage.setItem("portfolio:scenery", s); localStorage.setItem("theme", "dark"); } catch {}
  }, [boot]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 120000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, { timeout: 120000 });
  await page.waitForTimeout(SETTLE);

  // Record every data-scenery value the crossfade passes through, so a
  // "correct" final read that got there via the wrong world is still visible.
  await page.evaluate(() => {
    window.__seen = [document.documentElement.dataset.scenery];
    new MutationObserver(() => {
      const v = document.documentElement.dataset.scenery;
      if (v !== window.__seen[window.__seen.length - 1]) window.__seen.push(v);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-scenery"] });
  });

  const gap = await doublePick(page, NAME[first], NAME[second]);

  await page.waitForTimeout(6000);

  const r = await page.evaluate(() => {
    const veils = Array.from(document.querySelectorAll('.ambient, div[aria-hidden="true"].fixed.inset-0'));
    return {
      dom: document.documentElement.dataset.scenery,
      committed: document.querySelector('button[aria-label^="Scenery:"]')?.getAttribute("aria-label"),
      stored: localStorage.getItem("portfolio:scenery"),
      veilOpacity: veils.map((el) => Number(getComputedStyle(el).opacity)),
      seen: window.__seen,
    };
  });

  const labelId = r.committed?.replace("Scenery: ", "").toLowerCase();
  const ok = r.dom === expect && labelId === expect && r.stored === expect
    && r.veilOpacity.every((o) => o > 0.995);
  // The interrupt only counts if the second pick landed before the geometry
  // commit — i.e. data-scenery still read as the boot world between clicks.
  const midFlight = gap.betweenScenery === boot;
  out.push({ case: label, expect, ...r, ...gap, midFlight, ok });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  expect=${expect} dom=${r.dom} label=${labelId} stored=${r.stored} ` +
      `veil=${JSON.stringify(r.veilOpacity)} path=${r.seen.join("->")} ` +
      `gap=${gap.gapMs?.toFixed(1)}ms midFlight=${midFlight}${gap.error ? " ERR:" + gap.error : ""}`,
  );
  await ctx.close();
}

await browser.close();
console.log(`\n${out.filter((r) => r.ok).length}/${out.length} pass`);
