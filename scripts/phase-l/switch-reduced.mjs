/** Part 7 × Part 10: the crossfade's reduced-motion bypass still collapses to
 *  one frame, and the interrupt guard did not strand `pendingId`. */
import { chromium } from "playwright";
const NAME = { atelier: "Atelier", observatory: "Observatory", garden: "Garden", blueprint: "Blueprint" };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript(() => { try { localStorage.setItem("portfolio:scenery", "atelier"); localStorage.setItem("theme", "dark"); } catch {} });
const page = await ctx.newPage();
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 120000 });
await page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, { timeout: 120000 });
await page.waitForTimeout(10000);

// Three switches back to back, each read immediately after the click.
for (const id of ["garden", "blueprint", "atelier", "observatory"]) {
  const r = await page.evaluate(async ([name]) => {
    const row = (n) => Array.from(document.querySelectorAll('[role="radio"]')).find((el) => el.textContent.includes(n));
    document.querySelector('button[aria-label^="Scenery:"]').click();
    for (let i = 0; i < 40 && !row(name); i += 1) await new Promise((r) => setTimeout(r, 0));
    const t0 = performance.now();
    row(name).click();
    const veils = Array.from(document.querySelectorAll('.ambient, div[aria-hidden="true"].fixed.inset-0'));
    return {
      elapsedMs: performance.now() - t0,
      dom: document.documentElement.dataset.scenery,
      inlineOpacity: veils.map((el) => el.style.opacity || "(none)"),
      opacity: veils.map((el) => Number(getComputedStyle(el).opacity)),
    };
  }, [NAME[id]]);
  const ok = r.dom === id && r.opacity.every((o) => o > 0.995) && r.inlineOpacity.every((v) => v === "(none)");
  console.log(`${ok ? "PASS" : "FAIL"}  -> ${id}: committed same task (${r.elapsedMs.toFixed(2)}ms) dom=${r.dom} inline=${JSON.stringify(r.inlineOpacity)} computed=${JSON.stringify(r.opacity)}`);
}
await browser.close();
