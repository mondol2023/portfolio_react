# Phase L — scene harness

Six scripts behind `PHASE_L_CREATIVE_DIRECTION_PLAN.md` (Parts 7, 8 and 9).
They exist because Part 7's accept criterion is a **measurement**, and Phase K
deferred it for want of a GPU-backed browser — so the measurement has to be
one command on whatever machine finally has one.

```bash
node scripts/phase-l/palette-matrix.mjs      # no browser, no dev server

npm run dev                                  # note the port
BASE=http://localhost:3000 node scripts/phase-l/switch-pairs.mjs
BASE=http://localhost:3000 node scripts/phase-l/switch-interrupt.mjs
node scripts/phase-l/switch-reduced.mjs
BASE=http://localhost:3000 node scripts/phase-l/interaction-states.mjs
BASE=http://localhost:3000 node scripts/phase-l/theme-matrix.mjs
```

| Script | Answers |
|---|---|
| `switch-pairs.mjs` | All twelve ordered pairs: commit/settle wall-clock, max rAF gap, and `veilAtCommit` — the veil's opacity at the instant the geometry track lands. Boots each pair from `localStorage` in a fresh context and drives the real picker. |
| `switch-interrupt.mjs` | A second pick arriving mid-crossfade (rewind, repeat, redirect). Both picks run in one page task, because a Playwright-driven popover round-trip is slower than the 900ms timeline and lets it finish in between — which is how the first run of this suite produced a false pass. |
| `switch-reduced.mjs` | `prefers-reduced-motion: reduce` still collapses the switch to one frame and writes no veil opacity at all. |
| `interaction-states.mjs` | Part 8's hover states, via the DOM half only: sweeps the drifter lanes for a point where the ray lands, then checks the body cursor is `grab`, that a nav link keeps its own `pointer`, and that §6.2's scroll gate suspends the hover during a flick and releases it afterwards. |
| `palette-matrix.mjs` | Part 9's 3D half, all 8 cells x 6 sections. Pure arithmetic — it imports `scene-palette.ts` and `scenery.ts` directly under Node's type stripping, so there is no browser, no dev server and no settle. Contrast of `surface`, `deep`, `accent` and `key` against what each sits on, at per-role thresholds. |
| `theme-matrix.mjs` | Part 9's DOM half. Boots all 8 cells from `localStorage`, stops at each of the six sections, and reports every settled text node's WCAG contrast against its **composited** ancestor background. Writes a screenshot per cell x section to `out/theme-matrix/` for the eyeball half of S15. |

**`veilAtCommit` is the number to read first.** It is a computed style at a
`MutationObserver` callback, so it stays true under a software rasterizer
where every wall-clock figure here is meaningless. It must be at or near
`VEIL_FLOOR` (0.08); anything higher means the world swapped in view.

**`palette-matrix.mjs` is the one to run first.** It is instant, it needs
nothing running, and it covers the half of Part 9 that a software rasterizer
cannot answer honestly: whether the geometry can be seen against the page at
all. Every colour the scene paints is derived from `--tone` and `--bg` by two
pure functions, so the whole matrix is arithmetic rather than pixels.

`theme-matrix.mjs` waits for `data-scenery` on `<html>` to match the cell
before measuring anything. `SceneryController` applies the stored scenery in a
post-mount effect (S2), so a probe that waits only for the canvas measures
atelier eight times and reports a clean pass.

`BASE` defaults to `:3000`, `SETTLE` (ms) to 20000 — drop it to ~2000 on a
real GPU, where the scene paints in a frame rather than ~20s.
`interaction-states.mjs` also takes `DWELL` (ms per sample point, default 800):
the hover ray runs every other frame, so the dwell must span two of them. On a
GPU ~100 is plenty, and the sweep finishes in seconds rather than minutes.
