/**
 * Phase L Part 9 — the DOM half of the light/dark x scenery matrix.
 *
 * Eight cells, six sections each, and one question per text node: what is its
 * contrast against what is actually painted behind it. Everything read here
 * is a computed style, so it stays true under SwiftShader — the numeric 3D
 * half is `palette-matrix.mjs`, which needs no browser at all, and the
 * screenshots this writes are for the human half of §15's S15.
 *
 *   ratio      — WCAG 2.1 contrast against the composited ancestor
 *                background, with every ancestor's alpha and `opacity` folded
 *                in. A translucent card over a tinted section over `--bg` is
 *                three layers, and only the composite is real.
 *   large      — >=24px, or >=18.66px at weight 700, i.e. the 3:1 bar.
 *   veiled     — cumulative opacity still under 1 after the settle. A
 *                <ScrollVeil> mid-entrance is not a contrast failure, and
 *                reporting it as one is trap 1 in CODEBASE_MAP.md §8.
 *
 * Scrolls to `block: "center"` and waits `SETTLE` at each stop, for the
 * reasons those five traps give. `BASE` defaults to :3000, `SETTLE` to 20000
 * — drop it to ~2000 on a real GPU.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SETTLE = Number(process.env.SETTLE ?? 20000);
const SHOTS = process.env.SHOTS ?? "scripts/phase-l/out/theme-matrix";

const SCENERIES = ["atelier", "observatory", "garden", "blueprint"];
const THEMES = ["light", "dark"];
const SECTIONS = ["home", "about", "skills", "projects", "experience", "contact"];

/** Runs in the page. One row per text-bearing element in a section. */
function probeSection(sectionId) {
  // Computed styles, so rgb()/rgba() covers what we composite. A `color-mix()`
  // background serializes as `color(srgb …)` and reads as null here — the text
  // is then measured against the page. See L9-6 in the plan.
  const parse = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a] = m[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map((v) => Number.parseFloat(v));
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
  });
  const lum = ({ r, g, b }) => {
    const c = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const root = getComputedStyle(document.documentElement);
  const pageBg =
    parse(root.getPropertyValue("--bg").trim()) ??
    parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };

  const section = document.getElementById(sectionId);
  if (!section) return [];

  const rows = [];
  for (const el of section.querySelectorAll("*")) {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!text) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;

    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;

    // Composite every ancestor background down to the page, outermost first,
    // and carry the cumulative `opacity` so a veiled section reads as veiled.
    const chain = [];
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      chain.push(node);
    }
    let backdrop = { ...pageBg };
    let cumulative = 1;
    for (const node of chain.reverse()) {
      const s = getComputedStyle(node);
      cumulative *= Number.parseFloat(s.opacity || "1");
      const bg = parse(s.backgroundColor);
      if (bg && bg.a > 0) backdrop = over(bg, backdrop);
    }

    const fg = parse(style.color);
    if (!fg) continue;
    const size = Number.parseFloat(style.fontSize);
    const weight = Number.parseInt(style.fontWeight, 10) || 400;

    rows.push({
      text: text.slice(0, 48),
      tag: el.tagName.toLowerCase(),
      size,
      large: size >= 24 || (size >= 18.66 && weight >= 700),
      opacity: Number(cumulative.toFixed(3)),
      ratio: Number(ratio(over(fg, backdrop), backdrop).toFixed(2)),
    });
  }
  return rows;
}

await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();
const failures = [];
const neverSettled = [];

for (const scenery of SCENERIES) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
    });
    await ctx.addInitScript(
      ([s, t]) => {
        try {
          localStorage.setItem("portfolio:scenery", s);
          localStorage.setItem("theme", t);
        } catch {}
      },
      [scenery, theme],
    );

    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 120000 });
    await page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, {
      timeout: 120000,
    });

    // `SceneryController` applies the stored scenery in a post-mount effect
    // (S2), so the attribute is still `atelier` for a moment after the canvas
    // exists. Waiting on the attribute rather than on a timeout is the
    // difference between measuring this cell and measuring atelier eight times.
    await page
      .waitForFunction(
        ([s, dark]) =>
          document.documentElement.dataset.scenery === s &&
          document.documentElement.classList.contains("dark") === dark,
        [scenery, theme === "dark"],
        { timeout: 30000 },
      )
      .catch(() => {});

    // The cell is only this cell if the attributes actually took.
    const applied = await page.evaluate(() => ({
      scenery: document.documentElement.dataset.scenery,
      dark: document.documentElement.classList.contains("dark"),
    }));
    if (applied.scenery !== scenery || applied.dark !== (theme === "dark")) {
      const got = `${applied.scenery}/${applied.dark ? "dark" : "light"}`;
      console.log(`  !! ${scenery} x ${theme} booted as ${got} — skipped`);
      await ctx.close();
      continue;
    }

    console.log(`\n${scenery} x ${theme}`);
    for (const id of SECTIONS) {
      await page.evaluate(
        (sid) => document.getElementById(sid)?.scrollIntoView({ block: "center", behavior: "instant" }),
        id,
      );
      await page.waitForTimeout(SETTLE);
      await page.waitForFunction(() => !document.body.innerText.includes("Compiling"), null, {
        timeout: 120000,
      });
      await page.screenshot({ path: `${SHOTS}/${scenery}-${theme}-${id}.png` });

      const rows = await page.evaluate(probeSection, id);
      const settled = rows.filter((r) => r.opacity >= 0.99);
      const bad = settled.filter((r) => r.ratio < (r.large ? 3 : 4.5));
      const worst = settled.reduce((min, r) => (min === null || r.ratio < min.ratio ? r : min), null);

      console.log(
        `  ${id.padEnd(11)} ${String(settled.length).padStart(3)} settled, ` +
          `${String(rows.length - settled.length).padStart(2)} veiled, ` +
          `worst ${worst ? String(worst.ratio).padStart(5) : "  n/a"}` +
          (bad.length ? `  — ${bad.length} under bar` : ""),
      );

      for (const r of bad) failures.push({ scenery, theme, section: id, ...r });
      if (rows.length && !settled.length) neverSettled.push(`${scenery}/${theme}/${id}`);
    }

    await ctx.close();
  }
}

await browser.close();

console.log(`\n${"=".repeat(72)}`);
if (neverSettled.length) {
  console.log(`Never settled — re-run before believing these: ${neverSettled.join(", ")}\n`);
}
if (failures.length === 0) {
  console.log("PASS — every settled text node clears its bar in all 8 cells.");
} else {
  console.log(`${failures.length} text node(s) under bar:\n`);
  for (const f of failures) {
    console.log(
      `  ${f.scenery}/${f.theme}/${f.section}  ${f.ratio} (needs ${f.large ? "3" : "4.5"})  ` +
        `<${f.tag}> ${JSON.stringify(f.text)}`,
    );
  }
}
process.exitCode = failures.length === 0 ? 0 : 1;
