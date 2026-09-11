# Phase 7 — measured performance record

Date: 2026-09-11. Branch `czrdtilt`, after Phases 1–6.

Measurement pass only. **No source file was changed by this phase** — see
"Conclusions" for why, and for what a later phase might pick up.

## How this was measured

The built application (`npm run build` → `next start`, port 3111), driven by a
**headed, GPU-backed Chromium** (Playwright 1.60.0 / Chromium 148.0.7778.96)
resolved from an install outside this repository, so no dependency was added
here. Headless numbers were not used for anything.

The GPU is real, not a software rasterizer:

```
unmaskedVendor:   Google Inc. (AMD)
unmaskedRenderer: ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001636) Direct3D11 vs_5_0 ps_5_0, D3D11)
version:          WebGL 2.0 (OpenGL ES 3.0 Chromium)   maxTextureSize: 16384
```

An instrumentation script injected before app code wraps `requestAnimationFrame`
/ `cancelAnimationFrame` (recording the scheduling call site), `getContext`,
`addEventListener` / `removeEventListener`, plus a `longtask`
`PerformanceObserver` and Resource Timing. The frame sampler uses the *raw*
`requestAnimationFrame` captured before wrapping, so it never counts itself.

Six passes were run. Two methodology corrections matter, because they changed
the conclusions:

1. **Pass 1's idle samples were contaminated by startup.** Tier A was sampled
   ~3.5 s after load, overlapping a 1789 ms startup long task, and tier A ran
   first against a cold server (`responseEnd` 970 ms vs 12–39 ms warm). Its
   "11.3 fps" was an artifact. Pass 5 warms the server, waits until the long-task
   stream has been quiet for 2 s, then takes three consecutive 3 s samples.
2. **Pass 1/5's scroll samples were contaminated by the driver.** Scrolling with
   `page.mouse.wheel` (one CDP round-trip per step) reported ~9.5 fps for both
   tiers A and B. Pass 6 scrolls entirely in-page from inside the sampler, with
   no round-trips, and the picture changes completely.

Numbers below are the warm, uncontaminated ones unless stated.

## Steady-state frame cost (desktop 1600×900, warm)

| Tier | Idle mean | Idle p50 | Idle p95 | Frames > 32 ms | In-page scroll mean | Scroll frames > 32 ms |
|---|---|---|---|---|---|---|
| A. capable GPU (LivingRiver) | 18.3–21.3 ms / 47–54 fps | 16.7 ms | 33.4 ms | 14–33 of ~150 | 24.71 ms / 40.5 fps | 54 of 201 |
| B. WebGL2 blocked (SectionScenery) | 16.67 ms / 60.0 fps | 16.7 ms | 16.9 ms | **0** of 179 | 16.95 ms / 59.0 fps | 3 of 294 |
| F. reduced motion (no scenery) | 16.67 ms / 60.0 fps | 16.7 ms | 17.0 ms | **0** of 180 | 16.67 ms / 60.0 fps | **0** of 300 |

Reading: the median frame is a full 60 fps frame in every tier. LivingRiver's
cost shows up as *dropped* frames — roughly a quarter of frames take a second
vsync (p95 33.4 ms idle, 50.1 ms scrolling) on this integrated GPU.
SectionScenery is effectively free by this measure, and reduced motion is
indistinguishable from an idle page.

Three consecutive tier-A idle samples improved monotonically —
**46.9 → 50.3 → 53.9 fps** — and the canvases measured at the end of the run
were **800×450 (webgl2)** and **1200×675 (2d)**, down from 1600×900 at settle.
That is the LivingRiver clock's adaptive scale working, and reaching its
`MIN_SCALE` floor of 0.5.

## Per-tier settled state

| Tier | Density | Canvases | Backing store | Live rAF loops at settle | Hidden-tab rAF | Console errors |
|---|---|---|---|---|---|---|
| A. Desktop + capable GPU | — (LivingRiver) | 2 (webgl2 + 2d) | 1600×900 → 800×450 / 1200×675 | 1 — `2ylagjyjnamu2.js` (LivingRiver) | 0 | none |
| B. Desktop, WebGL2 blocked | full | 1 (2d, in `.ambient`) | 1585×900 for 1585×900 | 1 — `1zq4u8ao_iapr.js` (SectionScenery) | 0 | none |
| C. Tablet 834×1112 dpr 2 | **moderate** | 1 (2d) | 1418×1890 (dpr≈1.7) | 1 — SectionScenery | 0 | none |
| D. Mobile 390×844 dpr 3 | **sparse** | 1 (2d) | 586×1266 (dpr≈1.5) | 1 — SectionScenery | 0 | none |
| E. `deviceMemory` 2, 1600×900 | **minimal** | 1 (2d) | 792×450 for 1585×900 (half res) | 1 — SectionScenery | 0 | none |
| F. Reduced motion | — | **0** | — | **0** | 0 | none |

Every tier runs **exactly one** full-viewport scenery system and **one** scenery
rAF loop. LivingRiver and SectionScenery were never observed running together.
Tier E's half-resolution backing store matches `QUALITY_FLOOR.minimal = 0.5`.

### Hidden-tab parity — the plan's flagged unknown, now closed

`docs/plan.md` flags SectionScenery's `document.hidden` parity as unconfirmed.
With `document.hidden` forced true and `visibilitychange` dispatched, and **no
preceding scroll**, over 2000 ms:

```
totalSchedules: 0   liveNow: []      — on all six tiers
```

Pass 1 had reported 18 / 28 / 12 schedules on tiers C/D/E. Those were
scroll-settling artifacts — Motion's frameloop finishing wheel-queued springs —
not a scenery loop failing to park. **SectionScenery parks on `document.hidden`,
same as LivingRiver.**

### Load timings (warm, `next start`)

| Tier | responseEnd | DCL | load | FCP | Startup long tasks |
|---|---|---|---|---|---|
| A | 29 ms | 145 ms | 489 ms | 356 ms | 163, 67, 75, 57, 211, 299 ms |
| B | 12 ms | 75 ms | 460 ms | 396 ms | 205, 65, 76, 102 ms |
| F | 13 ms | 88 ms | 441 ms | 392 ms | 208, 63, 117 ms |

JS heap after a scroll pass: 9.6–11.8 MB used across tiers; no growth pattern
was observed over the ~30 s each context was open. Longer-horizon leak testing
was not performed.

## rAF / listener inventory

| System | Loop / listener | Always active? | Conditional? | Expected default state |
|---|---|---|---|---|
| LivingRiver | rAF loop, `2ylagjyjnamu2.js:413:22258` | No | Desktop + `pointer:fine` + `hover:hover` + ≥1024px + WebGL2 + motion allowed + `living-river` layer flag | Running on tier A only; parks on `document.hidden` |
| SectionScenery | shared rAF loop, `1zq4u8ao_iapr.js:1:20300` | No | Scenery enabled, motion allowed, LivingRiver ineligible or off | Running on tiers B–E; parks on `document.hidden` |
| Motion scroll springs | rAF, `2qvqe_za_sgjl.js:1:96726` | No | Only while a scroll-linked value is in flight | Absent at idle; appears during scroll/transition, then stops |
| `card-tilt` | rAF, `1zq4u8ao_iapr.js:1110:1700` | No | Only when drawn *and* `pointer:fine`; parks when no card is easing | Not in the default set (see below); parked when idle |
| `card-tilt` listeners | `window` `pointermove` + `scroll` (passive), `document` `pointerover` + `pointerout` (passive) | No | Same gate | All four removed on teardown |
| `scenery` (surprise) | CSS keyframes only — **no rAF, no canvas** | Yes (pinned) | — | `surprise-scene-drift`, 30 s, infinite, compositor-only |

The default pinned set in this deployment resolves to `["scenery"]`, so
`card-tilt` is **not** part of the default experience — it only appears when
drawn from the surprise button. No system was observed creating a duplicate
loop, in any tier, at any point.

## Canvas / WebGL inventory

- Default desktop (tier A): **2 canvases** — one WebGL2 and one 2D, both
  LivingRiver's. Default mobile/tablet/low-power: **1** (SectionScenery, 2D).
  Reduced motion: **0**.
- No hidden or inactive scenery creates a canvas. Tier F reaches settle with
  zero canvases in the document.
- WebGL resources are created only after the eligibility gate resolves. One
  caveat: on tier F a transient `2d` context and one throwaway `webgl2` probe
  appear during the hydration pass and are gone by settle. Root cause is the
  `useSyncExternalStore` stale-closure pattern — React's post-hydration check
  invokes the `getSnapshot` closure captured during the hydration render, which
  still carries the server snapshot. It leaves nothing running.
- Context-loss handling and long-horizon resource release on repeated
  mount/unmount were **not** exercised by these passes. See "Unknown".

## Bundle / code splitting

Script sets were diffed between an eligible and an ineligible visitor:

- **Tier A only:** `['/_next/static/chunks/2ylagjyjnamu2.js']` — **45,496 B**
- **Tier B only:** `[]`
- **Tier F vs tier B:** byte-identical script sets

Totals: tier A 1,159,211 B decoded across 17 scripts; tiers B–F 1,113,715 B
across 16. Largest chunks on tier A:

| Chunk | Decoded | Contents |
|---|---|---|
| `044i13hp34b29.js` | 324,922 B | framework/vendor |
| `37ukl2sboo9lr.js` | 234,172 B | vendor |
| `1cm13rs8zh1o8.js` | 166,483 B | app |
| `2qvqe_za_sgjl.js` | 134,008 B | Motion |
| `1zq4u8ao_iapr.js` | 97,981 B | surprise catalog + SectionScenery |
| **`2ylagjyjnamu2.js`** | **45,496 B** | **LivingRiver (dynamic)** |
| `1rc0cf2ww1x2t.js` | 13,670 B | gl/context + reduced-motion helpers |

**The Phase 4 goal holds:** ineligible and reduced-motion visitors never fetch
the LivingRiver implementation. `WATER_GLSL` / `createWaterRenderer` stay inside
the dynamic chunk; SectionScenery appears in exactly one chunk. No change was
warranted.

## Phase 6 interaction validation

### Card tilt (drawn from the surprise button; 2 cards on screen)

| Step | Observed |
|---|---|
| 1. Pointer enters a card (+50 ms) | `stamped: 1`, `--tilt-k: 0.1400` — stamped in the same task as `:hover` |
| 2. Settled on card A | `--tilt-k: 0.7787`, easing toward rest |
| 3. Pointer moves across the card | `rx` 0.556 → −0.395 → 0.284 → −0.553 → 0.456 → −0.622; `gy` 29.4% ↔ 72.8% — tracks the pointer |
| 4. Pointer exits | `stamped: 0` |
| 5. Crossing A → B | `{stamped: 2, live: 2}` across all six samples (~540 ms) |
| 6. Page scrolls, pointer stationary | `gx` → 85.2%, `rx`/`ry` updated — the scroll re-aim path works |
| 7. Keyboard focus | Handled by CSS `:focus-within`, not by the tilt loop |
| 8. Touch / coarse pointer | Drawn (label appeared in the status chip) and **refused to mount**: no `style[data-surprise="card-tilt"]`, `stamped: 0`, unchanged after tapping a card |
| 9. Reduced motion | Effect carries `animated: true`, so `SiteAnimations` filters it out entirely |

Two cards stamped at once during a crossing is **documented, intended
behaviour** — the card being left is still easing back to flat while the card
being entered is already leaning. `EASE 0.14` / `SETTLED 0.01` implies ~30
frames ≈ 500 ms, which matches the ~540 ms observed.

No stranded attribute was found on either exit path: after leaving a card,
`stamped: 0`; after a `pointerout` with a null `relatedTarget` (pointer leaving
the document entirely), `stamped: 0`. The loop parks correctly —
`rafWhileParked: 124 schedules / 2000 ms` is LivingRiver alone at ~60 fps, and
the live-loop list at exit contains only LivingRiver. With the tab hidden,
2 schedules in 2000 ms (trailing frames, not a leak). Zero page errors
throughout.

The touch case needed a dedicated pass: `start()` returns *before* injecting
anything on a coarse pointer, so "refused" and "never drawn" are
indistinguishable from the DOM. Detecting the draw via the button's live-region
status chip separated them — the chip read *"Neon signage · The project cards
started leaning toward you · The type changed size"* while the DOM stayed clean.

### Project cards

- Hover flips the image pair `["1","0"] → ["0","1"]`, and back to `["1","0"]` on
  leave. Keyboard `:focus-within` (driven by focusing the card's own link):
  `before ["1","0"] → after ["0","1"] → restored ["1","0"]`.
- Reduced motion: opacities stay `["1","0"]` through hover and focus — the
  `motion-safe:` prefixes suppress the swap, as intended.
- **No layout shift.** The card rect is `749.33 × 753.31` before, during and
  after, on both the capable and the reduced-motion tier.
- **Hover triggers no image loading.** The secondary image is `loading="lazy"`
  and is fetched when the card enters the viewport, not on hover — both images
  read `complete: true` before the pointer arrived. Total imagery over a full
  scroll: 41,516 B desktop / 67,842 B mobile.

## Conclusions

**Measured.** Everything in the tables above: per-tier canvas counts and backing
stores, density tiers, live rAF loops and their call sites, hidden-tab parking
on all six tiers, warm idle and in-page scroll frame statistics, load timings,
long tasks, heap use over ~30 s, the 45,496 B LivingRiver chunk and the
byte-identical ineligible script set, the full card-tilt sequence including
touch refusal, and the project-card hover/focus/layout/image behaviour.

**Inferred.** Chunk *contents* are attributed from module boundaries and the rAF
call sites that land in each chunk, not from a bundle analyzer. Tier E is a
`deviceMemory` override rather than genuinely slow hardware, so it verifies the
*signal and the density tier*, not real low-end performance. Tiers C and D are
Chromium device emulation, not physical devices.

**Unknown — not claimed.** Real mobile and real low-end GPU performance. WebGL
context-loss handling under an actual lost context. Resource release across
repeated mount/unmount cycles. Long-horizon memory behaviour. Lighthouse scores
and field metrics (no Lighthouse run was performed). Interaction latency beyond
what the frame sampler shows.

### The one measured cost, and why nothing was changed

LivingRiver drops roughly a quarter of frames on this integrated AMD GPU —
p95 33.4 ms idle, 50.1 ms while scrolling, 54 of 201 scrolled frames over 32 ms
— while every fallback path holds a locked 60 fps. This is the intended cost of
a ray-marched WebGL2 backdrop on integrated graphics, and the adaptive clock is
already responding correctly: it scaled to its `MIN_SCALE` floor and idle fps
climbed 46.9 → 53.9 across successive samples. Reducing it further would mean
changing the shader, the renderer, or the eligibility gate — all outside this
phase. Recorded here as a known characteristic, not a defect.

Two observations for a future phase, neither acted on:

- **`scenery.ts` has no `animated: true` flag.** `SiteAnimations`'s
  reduced-motion filter therefore does not drop it, and it stays mounted with an
  infinite CSS animation under `prefers-reduced-motion`. It is *currently*
  neutralised by the blanket override in `globals.css` — verified empirically,
  not assumed: on tier F the layer reads `animationDuration: 1e-05s`,
  `animationIterationCount: 1`, and `transform: "none"` at both T0 and T1, while
  on tier A the same element's transform visibly changes between samples
  (`matrix(1.08211, …, −56.4681, −21.3787)` → `matrix(1.08459, …, −53.5424,
  −20.271)`). So this is a latent robustness gap that depends on a global CSS
  rule, not a live reduced-motion violation.
- **The hydration-pass throwaway contexts** on the reduced-motion path (one 2D,
  one WebGL2 probe) are harmless but avoidable; they come from the
  `useSyncExternalStore` server-snapshot closure, not from the scenery gate's
  logic.

## Validation

- `npx tsc --noEmit` — clean.
- `npm run build` — passes (Turbopack, 8.4 s compile, 5.7 s TS, 13/13 static
  pages).
- `npm run lint` — one pre-existing error in
  `src/components/admin/analytics/share-donut.tsx:39`
  (`react-hooks/immutability`) plus one pre-existing warning in
  `src/components/admin/experience-form.tsx:49`. Both files are untouched by
  this phase (last modified 2026-08-18, `ace08fb`) and unrelated to it.
- `git status --porcelain` is byte-identical to the pre-phase baseline apart
  from this file. No dependency was added; Playwright was resolved from an
  install outside the repository.
