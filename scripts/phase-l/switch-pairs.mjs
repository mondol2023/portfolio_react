/**
 * Phase L Part 7 — the twelve ordered scenery-switch pairs.
 *
 * Per pair: boot into `from` via localStorage (never by switching into it),
 * wait for the canvas and a long settle, then drive the real picker UI to
 * `to` and record:
 *   commitMs  — click → <html data-scenery> becomes `to` (the geometry track)
 *   settleMs  — click → veil opacity back to 1 on every veil target
 *   maxGapMs  — longest rAF gap across the switch
 *   veilAtCommit — veil opacity at the instant data-scenery flips. This is
 *               the retime's invariant and the only number here SwiftShader
 *               cannot distort: the heaviest commit must land while the
 *               world is still hidden, or the veil uncovers the new scene's
 *               mount hitch. Read from a MutationObserver, not the rAF poll,
 *               so it is not up to one 350ms frame late.
 *   landed    — what <html data-scenery> AND the store's committed id read
 *               after the switch, so a wrong landing is distinguishable from
 *               a slow one.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const IDS = ["atelier", "observatory", "garden", "blueprint"];
const NAME = { atelier: "Atelier", observatory: "Observatory", garden: "Garden", blueprint: "Blueprint" };
const SETTLE = Number(process.env.SETTLE ?? 20000);
const WINDOW = Number(process.env.WINDOW ?? 12000);

const pairs = [];
for (const from of IDS) for (const to of IDS) if (from !== to) pairs.push([from, to]);

const browser = await chromium.launch();
const results = [];

for (const [from, to] of pairs) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([s]) => {
    try { localStorage.setItem("portfolio:scenery", s); localStorage.setItem("theme", "dark"); } catch {}
  }, [from]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 120000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, { timeout: 120000 });
  await page.waitForTimeout(SETTLE);

  const booted = await page.evaluate(() => document.documentElement.dataset.scenery);
  if (booted !== from) { results.push({ from, to, error: `booted as ${booted}` }); await ctx.close(); continue; }

  // Instrument before the click so t0 is the gesture, not a poll tick.
  await page.evaluate(() => {
    const w = window;
    w.__probe = { gaps: [], commitMs: null, settleMs: null, t0: null, veilAtCommit: null };
    const veils = Array.from(document.querySelectorAll('.ambient, div[aria-hidden="true"].fixed.inset-0'));
    w.__probe.veilCount = veils.length;

    new MutationObserver(() => {
      if (w.__probe.veilAtCommit !== null) return;
      if (document.documentElement.dataset.scenery !== w.__probe.want) return;
      w.__probe.veilAtCommit = veils.map((el) => Number(getComputedStyle(el).opacity));
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-scenery"] });
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (w.__probe.t0 !== null) {
        w.__probe.gaps.push(now - last);
        if (w.__probe.commitMs === null && document.documentElement.dataset.scenery === w.__probe.want) {
          w.__probe.commitMs = now - w.__probe.t0;
        }
        if (w.__probe.commitMs !== null && w.__probe.settleMs === null) {
          const opaque = veils.every((el) => {
            const o = Number(getComputedStyle(el).opacity);
            return !Number.isFinite(o) || o > 0.995;
          });
          if (opaque) w.__probe.settleMs = now - w.__probe.t0;
        }
      }
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.click('button[aria-label^="Scenery:"]');
  await page.waitForSelector('[role="radio"]');
  await page.evaluate(([t]) => { window.__probe.want = t; window.__probe.t0 = performance.now(); }, [to]);
  await page.click(`[role="radio"]:has-text("${NAME[to]}")`);

  await page.waitForFunction(() => window.__probe.settleMs !== null, null, { timeout: WINDOW }).catch(() => {});
  await page.waitForTimeout(500);

  const r = await page.evaluate(([t]) => {
    const p = window.__probe;
    const gaps = p.gaps.slice().sort((a, b) => a - b);
    return {
      commitMs: p.commitMs,
      veilAtCommit: p.veilAtCommit,
      settleMs: p.settleMs,
      maxGapMs: gaps.length ? gaps[gaps.length - 1] : null,
      medianGapMs: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
      frames: gaps.length,
      veilCount: p.veilCount,
      domScenery: document.documentElement.dataset.scenery,
      landedOk: document.documentElement.dataset.scenery === t,
      label: document.querySelector('button[aria-label^="Scenery:"]')?.getAttribute("aria-label"),
    };
  }, [to]);

  results.push({ from, to, ...r });
  console.log(`${from} -> ${to}`, JSON.stringify(r));
  await ctx.close();
}

await browser.close();
console.log("\nJSON " + JSON.stringify(results));
