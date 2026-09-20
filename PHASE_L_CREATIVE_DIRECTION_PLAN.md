# Phase L — Creative Direction, 3D Motion & Final Experience Polish

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

This is the **execution brief** for [SCENERY_SYSTEM_PLAN.md](SCENERY_SYSTEM_PLAN.md)'s
own `[ ] Phase L — Creative-direction review` (§13) and its quality bar (§15).
It does not replace either — it expands "review as a director; fix what
fails" into a concrete, file-by-file pass, because Phases A–K built the
system and nobody has yet looked at the rendered result end to end. Read
[SCENERY_SYSTEM_PLAN.md](SCENERY_SYSTEM_PLAN.md) §1 (Direction), §10 (motion
& scroll performance contract), §11 (control matrix), §12 (performance
contract) and §16 (non-goals) before touching code — they are binding here
unchanged.

**Sibling trackers — do not duplicate their scope here:**

| File | Owns | Relationship |
|---|---|---|
| [THREE_D_EXPERIENCE_PLAN.md](THREE_D_EXPERIENCE_PLAN.md) | Act I | Foundation. |
| [IMMERSIVE_3D_WORLD_PLAN.md](IMMERSIVE_3D_WORLD_PLAN.md) | Act II | Every invariant in its §0 still binds. |
| [SCENERY_SYSTEM_PLAN.md](SCENERY_SYSTEM_PLAN.md) | Act III, phases A–L | **This file is Phase L's brief, not a fifth act.** |
| [GAME_LAYER_PLAN.md](GAME_LAYER_PLAN.md) | Opt-in Game Mode (`src/game`) | Untouched. |
| [GAMIFICATION_PLAN.md](GAMIFICATION_PLAN.md) | Scoring on Game Mode | Unrelated. |

---

## Role

Act as a **Senior Creative Director, 3D Motion Art Director, WebGL
Interaction Engineer, and Frontend Animation Specialist** reviewing the
production-rendered site — not the source. Direct the finished experience:
find what feels unfinished, generic, disconnected, mechanically animated, or
inconsistent, and fix it at the layer that already owns it (see the file map
in Part 0). The result should read as one art-directed 3D portfolio with four
worlds, not a portfolio with Three.js effects bolted on.

## Critical architectural rule

Phases A–K already built the system this reviews. **Do not** redesign Act
III, build a second scenery system, a second animation architecture, or a
second canvas. Every rule in
[SCENERY_SYSTEM_PLAN.md §1](SCENERY_SYSTEM_PLAN.md#1-direction-binding--re-read-before-every-phase)
stays authoritative during this pass:

- one WebGL canvas, one `THREE.Timer` ([scene-timer.ts](src/lib/experience/scene-timer.ts))
- scenery is global state ([scene-scenery-store.ts](src/lib/store/scene-scenery-store.ts))
- scenery definitions are data ([scenery.ts](src/lib/experience/scenery.ts)), never a `switch` in an object file
- scroll is the only story parameter
- scenery switching is the existing GSAP crossfade ([scenery-transition.ts](src/lib/experience/scenery-transition.ts)), never a remount
- reduced motion is a designed still state, not disabled motion
- `src/components/ui` is off-limits (S18)
- no new dependency (§17) — everything this pass needs (GSAP, the `SPRING`
  vocabulary, `scene-motion.ts`) is already installed and already used

If a Phase L fix seems to require breaking one of these, the fix is wrong —
find the version that works inside the existing architecture.

---

## Part 0 — Where each finding actually lives

Before triaging anything, know the file each scenery's identity lives in, so
a finding routes to a fix instead of a rewrite:

| System | File(s) |
|---|---|
| Light rig, hemisphere/key/spot per scenery | [lighting.tsx](src/three/scene/lighting.tsx) |
| Tone mapping, exposure, colour space | [scenery.ts](src/lib/experience/scenery.ts), applied in `scene-canvas.tsx` (S5) |
| Palette skin (hue/chroma/lightness per scenery) | [scene-palette.ts](src/lib/experience/scene-palette.ts), `applyScenerySkin` |
| Ambient CSS backdrop (the visible "background") | [ambient-background.tsx](src/components/layout/ambient-background.tsx), `[data-scenery]` blocks in `globals.css` |
| Skills variants | `src/three/objects/skills/{constellation,orrery,growth,schematic}.tsx` + `skills/layout.ts` |
| Projects variants | `src/three/objects/projects/{corridor,monoliths,foliage,plansheets}.tsx` + `projects/layout.ts` |
| DOM skills/projects variants | `src/components/skills/variants/`, `src/components/projects/variants/` |
| Timescale per scenery | `scenery.ts` → `scene-timer.ts` `setTimescale()` |
| Crossfade timeline | [scenery-transition.ts](src/lib/experience/scenery-transition.ts) |
| Raycast / hover / click / drag | [scene-raycaster.ts](src/lib/experience/scene-raycaster.ts), `scene-interaction-store.ts` |
| Inspect mode / `OrbitControls` | wherever §6.3 landed for `blueprint` (grep `OrbitControls`) |
| Cursor aura | [cursor-aura.tsx](src/components/layout/cursor-aura.tsx) |
| Scroll velocity gate | [use-scroll-velocity.ts](src/lib/experience/use-scroll-velocity.ts) |
| Shared easing/spring vocabulary | [scene-motion.ts](src/lib/experience/scene-motion.ts) (`damp`, `dampFactor`, `springStep`, `stagger`, `easeOut*`), [springs.ts](src/lib/experience/springs.ts) (`SPRING` named values) |
| Device-tier budgeting | [device-tier.ts](src/lib/experience/device-tier.ts) |

A finding that names a symptom but not one of these files (or a specific line
in one) is not yet actionable — locate it before writing the fix.

---

## Part 1 — Test matrix  `[x]`

Every judgment in Parts 2–13 must be made against the **rendered page**,
driven with a real browser (Playwright, per
[SCENERY_SYSTEM_PLAN.md §14](SCENERY_SYSTEM_PLAN.md#14-verification-protocol)),
not read off the source:

- All four sceneries: `atelier`, `observatory`, `garden`, `blueprint`
- Light theme × dark theme (8 combinations total, §9 below)
- Desktop `1440×900`, tablet `1024×820`, mobile `390×844`
- `prefers-reduced-motion: reduce`
- Fine pointer and coarse pointer (`useFinePointer()`)
- WebGL enabled and the `SceneErrorBoundary` fallback (WebGL off / `three-scene` off)
- `low` device tier (forced) as well as default tier detection
- Scenery switching, in both directions, across sceneries
- Full-page scrolling, at rest and mid-flick
- Hover, click, drag (`observatory` monoliths), Inspect mode (`blueprint`)

Use [SCENERY_SYSTEM_PLAN.md §11](SCENERY_SYSTEM_PLAN.md#11-control-matrix)'s
control matrix as the checklist of *conditions*; this file is the checklist
of *what to judge* under each one.

---

### Part 1 — Results (run 2026-09-20)

**How it was driven.** Playwright (global 1.63.0) against `npm run dev` on
`:3001`. Scenery and theme are seeded into `localStorage`
(`portfolio:scenery`, `theme`) via `addInitScript` *before* app code runs, so
each context boots directly into the target world rather than switching into
it. Scenery switching is driven through the real
[scenery-picker.tsx](src/components/layout/scenery-picker.tsx) UI
(`button[aria-label^="Scenery:"]` then `[role="radio"]`), never by poking the
store. Harnesses live in the session scratchpad (`matrix.mjs`, `controls.mjs`,
plus `canvas-probe.mjs` / `webgl-off.mjs` / `hero-paint.mjs` for diagnostics).

**Coverage actually driven — every row of Part 1 is now covered:**

| Condition | Result |
|---|---|
| 4 sceneries × light/dark × `1440×900` / `1024×820` / `390×844` | 72 screenshots (3 scroll positions each) + 24 DOM probes |
| `prefers-reduced-motion: reduce`, all four | canvas present, h1 present, 6 sections, **0 errors** — passes |
| Coarse pointer (`hasTouch`+`isMobile`, `390×844`) | clean, 0 errors |
| WebGL off (`getContext("webgl*")` returns `null`) | `SceneErrorBoundary` fallback renders a complete, well-composed page — passes |
| Forced `low` tier (`deviceMemory=2`, `hardwareConcurrency=2`) | clean, 0 errors |
| All 12 ordered scenery-switch pairs | driven; 3 landed wrong — see *Unresolved* |
| Full-page scroll, pointer in motion | traced, but the numbers are not valid — see *Deferred* |

**Probe result across all 24 combinations:** canvas present in 24/24;
`data-scenery` matched the requested world in 24/24; zero horizontal overflow
on `main` or `documentElement` at every viewport; zero page errors and zero
console errors. The structural layer is sound — every defect below is an
art-direction or identity defect, not a broken one.

#### Findings

**P1 — `--accent` and `--tone` are atelier-orange in all four worlds.**
Measured, not inferred: across all 8 scenery × theme combinations the probe
read `--accent` as exactly `#c2410c` (light) / `#fb923c` (dark) and `--tone`
as `rgb(194, 65, 12)` — **identical in all four sceneries**, varying only by
theme. Confirmed in source: no `[data-scenery]` selector in `globals.css`
sets any accent or typography token; those blocks only skin the `.ambient*`
backdrop, and **`[data-scenery="observatory"]` has no block at all**.
`applyScenerySkin` reaches WebGL only, never the DOM tokens. Visible result:
the "View selected work" CTA, the italic "Senior Software Developer" tagline,
and blueprint's "Shipped" label are all orange inside garden's green world and
blueprint's cyan-on-paper drafting world.
Routes to `[data-scenery]` accent/tone tokens in
[globals.css](src/app/globals.css) (Part 0 row 4, Part 9).

**P1 — The hero is one composition wearing four hues.** All four sceneries
render the *same* hero: the same ring, the same sphere behind the type, the
same chain of roughly ten faceted nodes trailing to the right, in the same
screen position. Only hue and material gloss change — warm orange (atelier),
green (garden), purple (observatory), black-and-pale-blue (blueprint). This is
broader than the "garden is a recolour" reading from the first pass: it is
every world, and it fails Part 16's first checkbox directly.
Routes to the per-scenery hero object composition, not to colour.

**P1 — 3D crosses and obscures typography in every scenery, at every
viewport.** The ring slashes through the H1 "Nur Mohammed Pavel" and strikes
through the italic tagline in all four worlds. Worst case is **blueprint light
at `1440×900`**, where a thick glossy black torus passes straight over the lede
("…web products that **stay** maintainable…") and through the body paragraph,
leaving "React and Next.js" only partly legible against it. At `390×844` the
ring and two nodes sit directly on top of the body copy, and the footer email
renders as "…@gmail.com" behind the badge. This violates Part 2 (typography
dominant; body contrast never below the AA baseline) and Part 11 (mobile must
read as designed, not reflowed).
Routes to `contentSafeFraction` in `scene-layout.ts`, waypoints in
[camera-rig.tsx](src/three/scene/camera-rig.tsx), or a budget scalar in
[scenery.ts](src/lib/experience/scenery.ts) — **not** a new component (Part 2).

**P1 — Blueprint contradicts its own declared identity.** `scenery.ts`
declares blueprint as `toneMapping: "none"`, unlit drafting materials,
`shadowsDisabled: true`, key light `0.05` — "cyan schematic lines on paper, no
shading". What renders is a **thick, glossy, specular-highlighted black torus**
and a **large opaque pale-blue shaded sphere**, both lit solids, in the one
world specified to have no solids at all. Its Projects section, by contrast, is
a genuine success — the plansheet cards read as real drafting sheets
(monospace, `[ WEB APP ]` brackets, `>> read case study`, corner ticks, blue
grid). The concept is right in the DOM and wrong in the hero.
Routes to the blueprint hero objects plus
[lighting.tsx](src/three/scene/lighting.tsx).

**P2 — Skill nodes are a rainbow in all four sceneries.** The node chain runs
olive, green, teal, navy, magenta, purple, orange in atelier, and the blueprint
wireframes are magenta/yellow/green/cyan rather than monochrome cyan. Per-node
hue variety overrides each world's temperament — notably atelier ("warm, calm,
editorial") and observatory ("deep, cinematic, precise").
Routes to `src/three/objects/skills/*` plus `scene-palette.ts`.

**Corrected from the first pass:** the "two clipped purple slabs" noted in
observatory and the "blank hero" in the WebGL-off fallback were both
capture-timing artifacts under SwiftShader, not defects. Neither appears in the
re-run with explicit canvas waits. Both are withdrawn.

#### Deferred — GPU-backed timing (Part 7 / §10 / §12)

This sandbox has **no GPU**; Chromium falls back to SwiftShader, which
dominates every frame and makes the recorded numbers meaningless against the
16ms/24ms budgets: scroll trace median **249.9ms** (p95 383.4ms, only 12
samples in 4s) on the default tier and 216.7ms forced `low`; switch pairs
committed between 945ms and 7050ms with max gaps 350–5766ms. These are recorded
for provenance only. **The measurement Part 15.5 assigns to Phase L is not
satisfied and remains open** — it needs a GPU-backed re-run before Part 16's
Performance box can be ticked. Screenshots and DOM probes from this run *are*
valid; timings are not.

#### Resolved by Part 7 — was the interrupt bug, not harness overrun

3 of the 12 switch pairs landed on the wrong scenery: `atelier → garden` landed
`atelier`, `atelier → blueprint` landed `garden`, `garden → observatory` landed
`garden`. This was consistent with an in-flight `runSceneryCrossfade` timeline
not being cancelled when a second pick arrives, and equally consistent with the
harness out-running a 900ms crossfade that SwiftShader stretched past 7s.

**It was the first.** Part 7 below reproduces it deterministically, on a build
with the fix stashed, without needing a GPU — see L7-1. The harness was a
contributing condition, not the cause: switching sequentially in one context
re-picks the world still on screen while its crossfade is in flight, which is
exactly the gesture the guard mishandled. Driven from a fresh settled context
per pair, all twelve land correctly on the unfixed build too.
Routed to [scenery-transition.ts](src/lib/experience/scenery-transition.ts).

#### Baseline (Part 15.6 — checked fresh this phase, do not cite older numbers)

- `npm run typecheck` — **15 errors**, all in the admin analytics tree
  (`visitors-panel.tsx` 6, `visitor-search.tsx` 3, `settings-form.tsx` 2,
  `visitor-table.tsx` 2, `ripple-toggle.tsx` 1, `visits-trend-chart.tsx` 1).
  Several are missing modules (`@/lib/analytics/{search,geo,period}`,
  `@/lib/firebase/repositories/analytics-repository`,
  `@/lib/actions/ripple-actions`) — an unfinished analytics feature that
  predates Phase L. **This makes `npm run build` fail.** Left unfixed: Part
  15.6 forbids silently fixing files this phase did not touch.
- `npm run lint` — **277 problems (28 errors, 249 warnings).**

#### Also noted, out of Phase L scope

An "Achievement unlocked: Adventurer" toast fires on the public site in Normal
Mode. That belongs to [GAMIFICATION_PLAN.md](GAMIFICATION_PLAN.md), which this
file's sibling table marks as unrelated — recorded here only so it is not
mistaken for a Phase L regression later.

---

## Part 2 — Visual hierarchy (judge first, before touching any file)  `[x]`

- Does typography stay the dominant communication layer in all four worlds?
  (§1 rule 1: body-copy contrast never drops below the current AA baseline.)
- Is the 3D scene supporting content or competing with it — is any object
  visually louder than the section it represents?
- Is there intentional negative space, or does geometry crowd the type?
- Does the composition read as designed at `390×844`, not merely reflowed
  from desktop?

Where 3D competes with content, the fix is a `scenery.ts` budget scalar
(opacity, scale, particle count) or a camera-framing adjustment in
[camera-rig.tsx](src/three/scene/camera-rig.tsx) — not a new component.

### Findings and fixes (2026-09-20)

Judged first against the rendered page at all four sceneries × light/dark ×
`1440×900` / `1024×820` / `390×844`, then re-verified the same way. Six
defects, all of them hierarchy, none needing a new component.

**L2-1 — Story progress was measured from the viewport's top edge, not the
reader's eyeline.** `storyProgress()` in
[use-scene-progress.ts](src/lib/experience/use-scene-progress.ts) compared raw
`window.scrollY` against section *midpoints*, while the `IntersectionObserver`
ten lines above it uses `MIDDLE_BAND` (`-45% 0px -45% 0px`) — the viewport
centre. Its own doc comment claimed both used the same eyeline. The
half-viewport gap put **every** waypoint late by 450px at `1440×900` and 422px
at `390×844` — a different fraction of every section at every viewport height,
so the choreography could not be tuned at one size without breaking another.
Measured effect: Hero's sculpture was still ~80% present over Skills' pills;
Projects' corridor walls had not reached the page gutters while Projects was on
screen. Fix: `y = window.scrollY + doc.clientHeight / 2`. One line, and the
single highest-leverage defect in Part 2 — it improved every section at once.

**L2-2 — The hero sculpture was the only scene object not using screen-fraction
placement.** Its group sat at world origin under a camera waypoint of
`[0,0,6]` looking at `[0,0,0]`: dead centre, over the H1. The torus cut through
"Mohammed" and struck through the italic tagline in every scenery.
[hero-sculpture.tsx](src/three/objects/hero-sculpture.tsx) now composes into
the hero's free edge via a new `heroColumnRightFraction()` in
[scene-layout.ts](src/lib/experience/scene-layout.ts) — Hero's block is
`max-w-4xl` *left-aligned*, so unlike every other section its free space is one
asymmetric edge, which `contentSafeFraction` (a centred-column model) cannot
describe. Below ~1200px there is no hero gutter at all; rather than grow a
second mobile-only composition it keeps the same placement and falls to
`drifters.tsx`'s `COLUMN_FLOOR = 0.12`. One rule, scaled — S11.

**L2-3 — The Skills graph was at full presence from scroll 0.** All four
variants in `src/three/objects/skills/` computed presence from `exit` alone, so
the node chain crossed Hero's tagline and About's copy two sections before its
own. Each now gates on `entry` as well, over the same short `0.12` ramp
`about-fragments.tsx` already used, which leaves the scatter-to-cluster
choreography untouched.

**L2-4 — Experience's floor and ceiling plates cost the copy half its
contrast.** In light mode `plateColor` is `palette.deep` (lightness ~0.17), so
plate opacity is subtracted from a white page directly behind the reading
column. Measured on the rendered page at Experience's eyeline (`atelier`,
light, `1440×900`), against the same page with the canvas hidden:

| element | DOM only | plates `0.16` | plates `0.09` | atmosphere off |
|---|---|---|---|---|
| `h3` "Software Developer" | 10.57 | 5.63 | **8.79** | 8.55 |
| body "Lumen Systems" | 9.39 | 5.22 | **8.03** | 7.73 |
| muted "Full-time · Hybrid" | 3.37 | 2.08 | **2.96** | 2.86 |
| meta "JAN 2021 — FEB 2023" | 2.16 | 1.32 | **1.87** | 1.83 |

Dropping the plates to `0.09` recovers *more* contrast than disabling
`atmosphere.tsx` entirely — the plates, not the shell, were the dominant cost —
and the corridor reads better for it, because the piers and rails stop merging
into one flat green field. Dark mode keeps `0.3`: there the plates are lighter
than the page and add nothing over the type. Note the muted and meta rows are
**already below AA in the DOM alone** (3.37 and 2.16); that is a pre-existing
DOM colour issue in files this phase did not touch (15.6), recorded here and
not fixed. What Part 2 owns is the 3D layer's share of the loss, which is now
~15% rather than ~47%.

**L2-5 — Reduced motion showed an unmeasured first frame.** R3F reports
`size.width === 0` on the frame before the canvas is measured, and under
`frameloop="demand"` nothing re-renders until the reader scrolls — so that one
frame is what they look at. `heroColumnRightFraction(0)` answered `-1`
("the column ends at the left edge"), handing back a full-width gutter and
parking the sculpture centre-screen at full size, over the headline. It now
treats an unmeasured viewport as narrow, not wide.

**L2-6 — About's fragments were forced fully present under reduced motion.**
`appear = reducedMotion ? 1 : …` in
[about-fragments.tsx](src/three/objects/about-fragments.tsx) put the whole
shard cluster over Hero's headline from the first frame — the loudest thing on
the page, in exactly the mode that asked for less. `appear` is a *scroll* gate,
not an animation, so it now applies in both modes (D7: scroll is the story
parameter, not something to switch off). `formAmount` is a different question —
it is the scatter-to-arc choreography, and landing that pose immediately is the
designed still state, so it keeps its `reducedMotion ? 1`.

Also changed: `about-fragments.tsx` carries Hero's lateral position as well as
its spin (`heroShellSpin.x`), so the shards now begin where the shell actually
is rather than cutting back to centre.

### Deferred, with the part that owns them

- `--accent` / `--tone` reads orange in all four worlds → **Part 9**,
  `[data-scenery]` blocks in `globals.css`.
- The hero is one composition wearing four hues; `blueprint`'s glossy lit
  solids contradict its declared `toneMapping: "none"` / `materials: "unlit"` /
  `shadowsDisabled` identity → **Part 3** + `lighting.tsx`.
- Skill-node hues are a rainbow (`buildNodes` rotates hue by category index)
  → **Part 3** + `scene-palette.ts`.
- One pink node cluster still crosses Skills' lede at `1440×900`. Camera
  waypoint poses are **Part 5**'s explicit territory; the framing lever is
  `PATH[2]`'s `lookAt` in `camera-rig.tsx`.
- Frame timings and the three mis-landing scenery-switch pairs → **Parts 7/12**,
  blocked: this sandbox has no GPU, so Chromium falls back to SwiftShader
  (~250ms/frame). Screenshots are valid evidence; timings are not.

### Verification

Playwright against the dev server, per Part 15.1–15.2. 14 matrix cells (4
sceneries × light/dark at `1440×900`, plus `1024×820` and `390×844` spot cells,
plus reduced motion), 6 sections each at the section's own eyeline — **0 page
errors, 0 console errors**. Contrast measured from the rendered pixels, not
asserted. `npm run typecheck`: no errors in any touched file. `npm run lint` on
the nine touched files: 5 errors / 0 warnings, **identical to their pre-change
baseline** (all five are pre-existing `react-hooks/immutability` in
`growth.tsx`). Full-suite baselines are unchanged and not re-cited here per
15.6.

---

## Part 3 — Each scenery as a separate world  `[x]`

Judge against the identity `scenery.ts` already declares (see
[SCENERY_SYSTEM_PLAN.md §4](SCENERY_SYSTEM_PLAN.md#4-the-four-sceneries-specified)),
not against a generic "does 3D look nice" bar.

### Atelier — *crafted*

Target: warm, calm, editorial, tactile. Check in [lighting.tsx](src/three/scene/lighting.tsx):
matte surfaces (roughness `0.55`) actually read matte under the hemisphere +
key/fill/rim rig; shadows are soft, not hard-edged; nothing moves that
doesn't need to (timescale `1.0`, restrained). It must still be
pixel-recognizable as "the site" per Phase A's own accept criterion —
Phase L is not licensed to redesign it.

### Observatory — *discovered*

Target: deep, cinematic, precise. Verify in [lighting.tsx](src/three/scene/lighting.tsx) /
`orrery.tsx` / `monoliths.tsx`: the animated key orbit reads as a *reason*
metal looks polished (does the specular highlight visibly travel?), AgX
tone mapping holds highlight roll-off, the spot on the hero sculpture
communicates "displayed object" rather than "spotlight demo." Reject: glow
without a light casting it, particles with no orbital logic, spin that isn't
tied to `orbitAxis` cross-product geometry §9 specifies.

### Garden — *alive*

Target: organic, unhurried (timescale `0.6`, the slowest). Verify in
`growth.tsx` / `foliage.tsx`: vine growth is scrubbed by scroll position
(`mixer.setTime`), not looping; leaf translucency (`transmission`) is visible
under the hemisphere bounce light; panel sway and camera-facing turns read as
settling, not idle-game bobbing. Reject any `Math.sin(time)` motion with no
scroll or hover tie — §13 below.

### Blueprint — *engineered*

Target: technical, precise, fast (timescale `1.25`, the highest — confirm it
reads as *quicker*, not just numerically different). Verify in
`schematic.tsx` / `plansheets.tsx`: trace-pulse motion is linear/mechanical,
not eased into a bounce; Inspect mode's `OrbitControls` behave predictably;
click-to-raise plan sheets settle without overshoot. This scenery should have
the *least* motion of the four and the *most* precision — if it feels playful
anywhere, that's a P1.


### Findings and fixes (2026-09-20)

Part 1's two structural P1s both land here, and both had the same root cause:
`SceneryDefinition` declared a field that **nothing read**. `geometry` was
dead, so all four worlds rendered atelier's sphere-and-torus in a different
hue; `materials` was dead, so all four rendered lit, shaded solids. A scenery
cannot be "a different world" while the fields that say what kind of world it
is are inert.

**L3-1 — `scenery.geometry` was a dead field; the hero was one composition
wearing four hues.** (Part 1's second P1, and Part 16's first checkbox.)
`hero-sculpture.tsx` is replaced by `src/three/objects/hero/`: a dispatcher on
`scenery.geometry` (the same shape `skills/index.tsx` and `projects/index.tsx`
already use), a shared `composition.ts` that owns placement/scale/presence for
all four, and one file per world. The shared module is the point — the four
differ by *geometry and temperament*, never by a branch inside a form file, and
the placement arithmetic Part 2 fixed (`heroColumnRightFraction`) stays written
once.

| World | Form | Temperament |
|---|---|---|
| atelier — *crafted* | glass sphere + fixed-tilt metal ring, **unchanged** | soft settle, `arrive 0.9s`, the only one that breathes |
| observatory — *discovered* | armillary: 3 gimbal rings on irrational-ratio orbits around a held core | slow spatial reveal, `arrive 1.6s`, no breath — a brass instrument does not pulse |
| garden — *alive* | a seed that has opened: translucent pod ringed by 7 leaves | organic emergence, `arrive 2.4s` (the longest), `idleSpeed 0` |
| blueprint — *engineered* | unlit wireframe solid inside its bounding cage, with dimension ticks | linear plotter draw via `setDrawRange`, `arrive 1.1s`, no idle, no breath |

Atelier is deliberately **not** redesigned: Phase A's accept criterion requires
it stay pixel-recognizable as "the site", so it keeps its exact composition and
only gains the shared placement.

**L3-2 — `scenery.materials` was a dead field; blueprint contradicted its own
identity.** (Part 1's fourth P1.) Blueprint declares `toneMapping: "none"`,
`materials: "unlit"`, `shadowsDisabled: true`, key light `0.05` — "cyan
schematic lines on paper, no shading". The hero fix above made that true of the
hero. It was still false of the frame: `drifters.tsx` — which crosses every
section of every world — hardcoded `MeshStandardMaterial` and never mentioned
`scenery` at all, so lit, shaded, opaque grey solids kept drifting through the
one world specified to contain none. Verified on the rendered page, not
inferred: blueprint light at `1440×900` showed a shaded grey slab and a shaded
grey octahedron beside a cyan wireframe hero.

`drifters.tsx` now takes `materials: MaterialFamilyId` and builds a
`MeshBasicMaterial` wireframe in the unlit family — one ink for every drifter,
matching `hueSpread: 0` ("a schematic is drawn in one ink"). Two traps came
with it, both handled: the frame loop's `instanceof MeshStandardMaterial` guard
would have skipped every blueprint drifter outright, leaving them stuck at the
`opacity: 0` they are built with; and `emissiveIntensity` is a lit-material
concept the unlit family has no property for. Only blueprint changes — the
other three declare lit families and render exactly as before.

**L3-3 — Skill nodes were a rainbow in all four worlds.** (Part 1's P2.)
`buildNodes` rotated hue by `categoryIndex / categoryCount` — the *full* wheel,
in every world, so the chain ran olive/green/teal/navy/magenta/purple/orange
inside atelier's "warm, calm, editorial" brief. Hue spread is now a per-scenery
constant (`scenery.hueSpread`: atelier `0.08`, observatory `0.05`, garden
`0.13`, blueprint `0`), centred on the accent rather than sweeping away from it
(`spread` runs `-0.5..0.5`). Category still has to be readable, so what a tight
spread gives up in hue is taken back as a lightness ladder — which is what lets
blueprint sit at `0` and stay monochrome.

**L3-4 — Garden moved on a clock, which is what its own definition forbids.**
`scenery.ts` states nothing in garden moves on its own clock, only in response
to scroll. Two files were the counter-example: `growth.tsx`'s
`sin(sceneTime.elapsed * 0.35)` root lean and `foliage.tsx`'s
`sin(sceneTime.elapsed * 0.45 + swayPhase)` per-leaf sway — both looping
forever at rest, which is the "idle-game bobbing" §3 rejects outright. Both now
integrate scroll *movement* into an energy term that `damp` returns to zero, so
the wall is disturbed by the reader and settles. Each leaf keeps its phase
offset as a fixed signed gain, so the wall still never moves in lockstep. At
rest, garden is now still.

**L3-5 — Blueprint's plan sheets bounced.** `plansheets.tsx` released on
`SPRING.panel` (stiffness 180 / damping 24 / mass 1 — damping ratio ~0.89,
documented as the spring for "panels that overshoot"). A drafting sheet that
bounces makes the one scenery specified as precise read as playful, which §3
calls a P1 in this world specifically. Now `gentle`, the vocabulary's one
explicitly overshoot-free spring. No new named entry — §17.

**L3-6 — Observatory's spot lit empty space.** The cone that marks the hero as
a "displayed object" aimed at `SpotLight.target`'s default, which is an
`Object3D` never added to the scene and so permanently at the origin. Since
Part 2 the hero composes into the page's free right edge — the one place it is
guaranteed *not* to be. The target is now a mounted `object3D` tracking
`heroShellSpin.x`, with the light offset from it, so the cone follows the form
across viewport widths.

### Verification

Playwright against the dev server on `:3001`, per Part 15.1–15.2, at
`1440×900`, all four sceneries × light/dark, seeded through `localStorage`
before app code runs, with the ~22s settle the sandbox's SwiftShader fallback
requires. **8/8 cells: canvas present, `data-scenery` matched, 0 page errors, 0
console errors.**

Part 16's first checkbox ("a different world, not a recolour of another") is
measured rather than asserted. The hero's free edge is reduced to a grid of
mean **gradient magnitude** and compared by cosine distance. Gradient magnitude
is invariant to luminance polarity, so a recolour leaves it unchanged while a
different composition moves the edges — which makes the same world in the
opposite theme a true recolour control. Raw luminance cannot do this job: the
backdrop swamps it, and under that metric the theme swap scored *higher* than
any scenery pair, which is why it was discarded.

| | distance (0 = edges in the same places) |
|---|---|
| **Recolour control** (same world, opposite theme) | blueprint `0.011` · garden `0.086` · observatory `0.266` · atelier `0.449` |
| **Different worlds**, same theme | `0.634`–`0.893` across all 12 pairs |

Every cross-world pair exceeds every same-world control; the closest two worlds
(garden vs blueprint, light) sit at **1.41× the worst control** and ~3× the
median. The four heroes are different compositions, not recolours.

### Intentionally left unchanged

- **Atelier's hero composition** — Phase A's accept criterion (above).
- **Garden's, observatory's and the corridor's drifter materials** — those
  worlds declare lit material families; L3-2 is scoped to `unlit` alone.
- **`--accent` / `--tone` still read `#c2410c` / `#fb923c` in all four
  worlds**, re-confirmed in all 8 cells this run. Still **Part 9**'s
  (`[data-scenery]` blocks in `globals.css`); `applyScenerySkin` reaches WebGL
  only. Visible as an orange CTA and an orange tagline inside blueprint's cyan
  drafting world.
- **Hero forms meet the right viewport edge** at `1440×900` in all four worlds,
  and garden shows only one leaf face-on from the fixed camera pose. Framing is
  **Part 5**'s explicit territory (`camera-rig.tsx` waypoints), not a
  composition change; recorded, not fixed here.
- **Two drifters cross the type column in garden light** (a slab over the "N"
  of "Nur", a shard over the body copy), both at `COLUMN_FLOOR` dimming.
  Composition against the reading column is **Part 11**'s.
- **Timings** — unchanged and still blocked: no GPU in this sandbox (§ Part 1's
  *Deferred*). Screenshots and DOM probes are valid; frame numbers are not.

### Baseline (Part 15.6 — checked fresh, unchanged by this part)

- `npm run typecheck` — **15 errors**, every one in the admin analytics tree,
  identical to the count recorded in Part 1. **0 errors in any file this part
  touched.** `npm run build` still fails on that pre-existing baseline.
- `npx eslint` on the two files this part changed (`drifters.tsx`,
  `scene-canvas.tsx`) — **0 errors, 0 warnings.**

> **Trap re-confirmed, for the next pass.** One capture in this run showed
> atelier's sphere-and-torus centre-screen over garden's headline — a total
> failure, and a pure artifact: the dev server was mid-HMR recompile
> ("Compiling …" was visible in the shot). Re-captured after compilation
> settled, garden was correct. Never judge a capture without asserting the
> compile indicator is absent; `CODEBASE_MAP.md` §8's two traps now have a
> third.

---

## Part 4 — Motion: what to add, and through what existing system  `[x]`

Before adding any motion, answer the four questions in Part 13 first. Where
the answer justifies motion, route it through what's already there:

| Need | Existing vocabulary — do not invent a new one |
|---|---|
| Damped settle / inertia / lag | `damp` / `dampFactor` in [scene-motion.ts](src/lib/experience/scene-motion.ts) |
| Spring release (drag, hover) | `springStep` in [scene-motion.ts](src/lib/experience/scene-motion.ts) |
| Staggered entrance | `stagger` in [scene-motion.ts](src/lib/experience/scene-motion.ts) |
| Named easing/duration by feel | `SPRING` in [springs.ts](src/lib/experience/springs.ts) — add a named entry only if reused 3+ places, never a bare number in a component |
| Per-scenery pace (garden slower, blueprint faster) | `scene-timer.ts` timescale, already wired per `scenery.ts` — do not add a second clock |
| Rotation | quaternion `setFromAxisAngle` / `slerp`, the pattern already established in `lighting.tsx`'s key orbit and `orrery.tsx` — never raw Euler accumulation (§9) |
| Multi-track sequencing (scenery switch) | GSAP timeline in [scenery-transition.ts](src/lib/experience/scenery-transition.ts) — the only place GSAP is used; do not add a second GSAP timeline elsewhere for section entrances |
| DOM entrance/reveal | [reveal.tsx](src/components/motion/reveal.tsx) / `motion/react` `useMotionPreference()` gate |

If a Phase L fix needs a motion primitive not in this table, that is itself
a finding to flag, not a license to import something new — check
`scene-motion.ts` and `springs.ts` again first; the vocabulary is usually
already there under a different name.

**Per-scenery entrance language** (evaluate, don't invent from scratch —
these should already exist from Phases G/I/J; Phase L polishes timing/easing,
not structure):

- Atelier → soft settle (`damp` toward rest, short)
- Observatory → slow spatial reveal (`slerp`-driven, camera-relative)
- Garden → organic emergence (scroll-scrubbed `mixer.setTime` / morph, never wall-clock)
- Blueprint → precise construction (linear reveal, dimensioned, no bounce)

Reject the generic "everything fades and moves up" pattern anywhere it
appears — it collapses all four identities into one.

### Findings and fixes (2026-09-20)

**L4-1 — The entrance language was one language wearing four hues.** This is
the motion twin of L3-1. All four Skills variants computed their arrival from
a byte-identical line (`smoothstep(entryProgress, 0, 1)`); three of the four
Projects variants and the Experience timeline all ran the identical
`easeOutCubic(stagger(…, 0.5))`; the DOM entered on one fade-and-24px-up in
every world. Four worlds, one arrival — exactly the generic pattern Part 4
says to reject.

Fixed as data, not as a `switch`. `scene-motion.ts` gained an `EntranceId`
(`settle` / `reveal` / `emerge` / `construct`) and a private `ENTRANCE` table
giving each one a *span* within the section's `entry` ramp, a *curve*, and a
*`stagger` overlap*; `entranceStagger(id, progress, index, count)` and
`entranceEase(id, progress)` are the only two exports. `scenery.ts` gained one
`entrance` field per world. No new easing function, integrator, clock, timeline
or dependency: `construct` is the existing `clamp01` used linearly, and every
other curve was already in the file.

**L4-2 — `easeInWave` in `plansheets.tsx` contradicted its own comment and its
world.** Documented as "sharper than `easeOutCubic`", it was `x*x*(3-2*x)` —
smoothstep, which is *softer* at the start, and an eased-in float in the world
whose brief is "linear reveal, dimensioned, no bounce". Deleted; the `shut`
exit now uses the shared `easeOutCubic`, and the sheet's arrival comes from
`construct` alone.

**L4-3 — `1 - Math.pow(0.001, delta)` re-typed by hand in two frame loops.**
`about-fragments.tsx` and `hero/composition.ts` each inlined the exact
expression `dampFactor` exists to have named once — and in `about-fragments.tsx`
the local const was called `damp`, shadowing the vocabulary's own `damp`. Both
now call `dampFactor(SCENE_SMOOTHING.glide, delta)`; the shadowing local is
renamed `follow`.

**L4-4 — The DOM half entered generically in all four worlds.**
`createFadeVariants` took one duration, one ease and one 24px offset. It now
takes an `EntranceId` and resolves an `ENTRANCE_PACE` row (duration, ease,
distance multiplier); `reveal.tsx` and `stagger.tsx` read it from
`useSceneSceneryStore`. Deliberately `renderScenery`, not `id`, so the pace
commits on the crossfade's geometry track rather than ahead of it. The
*vocabulary* stays fade+travel in every world — only the pace changes —
because Part 2 fixed typography as the stable layer; blueprint's row is quick,
short and `linear`, garden's and observatory's are slow and further.

### Verification

**Numeric, from the compiled module** (`tsc` on `scene-motion.ts`, then the
real export called — not a re-implementation). Arrival of a 6-item group as the
section's `entry` ramp advances:

| entry | settle | reveal | emerge | construct |
|---|---|---|---|---|
| 0.1 | 0.269 | 0.009 | 0.100 | 0.148 |
| 0.3 | 0.716 | 0.159 | 0.320 | 0.477 |
| 0.5 | 0.999 | 0.500 | 0.555 | 0.806 |
| 0.7 | 1.000 | 0.841 | 0.803 | 1.000 |
| 0.9 | 1.000 | 0.991 | 0.997 | 1.000 |

| | 90%-arrived at | items in flight at the busiest moment |
|---|---|---|
| **settle** (atelier) | `0.380` | 3 — together, early, then at rest |
| **reveal** (observatory) | `0.750` | 6 — the whole field turns as one body |
| **emerge** (garden) | `0.795` | 2 — slow, strictly one after another |
| **construct** (blueprint) | `0.555` | 2 — quick, sequential, constant rate |

Four languages separated on two axes a viewer can actually see: together vs.
sequential, and early vs. across the whole approach. `reveal` was retuned
(overlap `0.8` → `0.95`) when the numbers showed item 0 finishing exactly as
item 5 began — zero simultaneity, which is not "as one body".

**Static gates (Part 15.6, checked fresh).** `npm run typecheck` — **15
errors**, every one in the admin analytics tree, identical to Part 1's count;
**0 in any file this part touched**. `npm run lint` — **277 problems (28
errors, 249 warnings)**, byte-identical to baseline (one new
`no-unused-vars` on `experience-timeline.tsx`'s now-dead `easeOutCubic` import
was removed rather than left).

**Browser matrix — 12/12 cells clean.** `matrix4.mjs` (project-local
Playwright 1.63, Chromium): 4 sceneries × light/dark plus a reduced-motion cell
each, `1440×900`, seeded via `localStorage` before app code runs, 22s settle,
scroll to `block: "center"`, "Compiling" asserted absent both sides of the
settle — all three `CODEBASE_MAP.md` §8 traps. Each cell captures `#projects`
**and** `#skills`, because Skills is where the four variants
(constellation/schematic/orrery/growth) diverge most and a Projects-only shot
would under-test the change. Every cell: correct `data-scenery`, correct theme
class, live canvas, 6 sections, an `h1`, no horizontal overflow, **0 page
errors, 0 console errors**; 33–35s each.

The four worlds read as four places in the captures — atelier's clustered
constellation, observatory's orrery on its rings, garden's vine tree,
blueprint's wireframe octahedra over a monospace list.

*One non-finding, recorded so it is not re-investigated:* `garden-light-skills`
came back missing its `FRONTEND` and `BACKEND` groups. It is a SwiftShader
paint artifact in the capture, not a defect — the same cell renders all five
groups in dark and in reduced motion, a dedicated re-run under identical
conditions painted all five, and a DOM probe reads all five headings at
`opacity: 1`, `transform: none`, at their correct offsets, at both 9s and 30s.
Added to §8 as a fourth trap.

### Intentionally left unchanged

- **Exits keep their existing `easeOutCubic`.** Entrances take the world's
  language; exits do not. `construct`'s span ends at `0.62`, so an exit
  adopting it would finish early and then pop.
- **`corridor.tsx`'s `phase(opening, …)` tracks** (`depthIn`, `markerIn`,
  `settleIn`). Only the panel wave now reads `entrance`. That multi-track
  choreography is atelier's signature moment and was tuned deliberately;
  re-timing it is a regression risk this part had no reason to take.
- **`contact-calm.tsx`** — one calm object, no stagger, calm in every world.
  There is nothing generic to reject.
- **`src/components/ui/`** — off-limits (S18). `section-heading.tsx` consumes
  `<Reveal>` and therefore inherits the per-world pace without being edited.
- **The DOM's fade+travel vocabulary** — see L4-4; per-world *pace*, not
  per-world *vocabulary*, by Part 2's ruling.
- **Timings** — still blocked, no GPU in this sandbox (Part 1's *Deferred*).

---

## Part 5 — Camera choreography  `[x]`

Review [camera-rig.tsx](src/three/scene/camera-rig.tsx)'s existing six
waypoints. Camera motion should reinforce section transitions, reveal
objects, and never make the visitor feel lost. It is already quaternion/lerp
based (§0.1) — confirm Phase L fixes stay that way; no Euler accumulation,
no free-camera mode outside Inspect (§6.3, `blueprint` only). Scroll remains
the sole driver everywhere Inspect mode isn't active.

### Findings and fixes (2026-09-21)

Judged against the rendered page, and against the waypoints projected through
a real `THREE.PerspectiveCamera` — the second because "does the camera frame
the object into the page's negative space" is a question about where world
origin lands in NDC, which a screenshot shows but does not measure. Every cell
was captured twice, once normally and once with the canvas hidden, and the
per-pixel difference between the two *is* the 3D layer; that difference map is
then measured against the reading column and the section's own text boxes, so
"the scene is over the type" is a number rather than an impression.

The headline result is that the path was doing less than its own comment
claimed. Four of the six waypoints lean laterally, but each one's `lookAt`
follows its `position` closely enough to cancel it:

| waypoint | world origin's screen x, in half-widths |
|---|---|
| hero | `0.000` |
| about | `-0.068` |
| skills | `+0.077` |
| projects | `0.000` |
| experience | `-0.062` |
| contact | `0.000` |

Against a reading column that claims `0.789` of each half-width, a 7% swing is
not "the object lands in the page's own negative space" — it is a rounding
error. Every section that *does* clear the column clears it in its own object
file, from `scene-layout.ts`. The path's real contribution is obliquity and
lens, which is worth having and is now what the comment says.

Six findings. Five are fixed in `camera-rig.tsx` — two waypoint aims, the
aspect handling, the delta clamp and the comment that overclaimed — and one in
`composition.ts`, where the arithmetic says the lever actually is rather than
where the deferral pointed. One finding (L5-3) is only partly dischargeable by
a camera and is recorded with its residual named.

**L5-1 — The path's lateral lean is cancelled by its own aim, and the comment
claimed otherwise.** `PATH`'s doc block states the path "leans *away* from
whichever side a section's object occupies, so the object lands in the page's
own negative space rather than dead centre behind an opaque card grid."
Projected through a real `PerspectiveCamera`, it does not: at `1440×900` world
origin lands at `-0.068` of a half-width at About, `+0.077` at Skills,
`-0.062` at Experience and exactly `0.000` at Hero, Projects and Contact —
because each waypoint's `lookAt` follows its `position` closely enough to
cancel it. Against a reading column that claims `0.789` of each half-width,
that is a rounding error. The sections that genuinely clear the column
(Projects `0.075`–`0.569`, Experience `0.141`–`0.226`, all under the `0.789`
a uniform wash would score) clear it in their own object files, from
`scene-layout.ts`; the camera's real contribution is obliquity and lens. The comment now says that, and names Skills as the one waypoint that has
to carry its own framing.

**L5-2 — The choreography was aspect-blind: the same waypoints swung the scene
3.5× further on a phone than on the desktop they were tuned on.** `fov` is
vertical, so the frame's world half-*height* is fixed at every viewport but its
half-*width* is that times the aspect. Every lateral number in the path is held
in world units, so its meaning drifts: About's `1.15` is `0.068` of a
half-width at `1440×900` and `0.236` at `390×844`, and Skills' outer cluster
leaves the frame entirely (NDC `1.44`). Measured on the rendered page at
`390×844`, **52.2%** of About's whole object layer sat inside the outer 3% of
the right edge, and its bounding box ran to `1.00` — on a phone that section's
3D had become a sliver against the frame's edge and nothing else. The share is
of a small absolute layer (274 difference-pixels), which is the point rather
than a caveat: what the viewport had left of About's 3D was the part hanging
off the edge. After, that share is `0.000` and the box closes at `0.95`.

The lateral track — dolly lean *and* pointer parallax, which had the same
defect and pulled four times as hard on a phone — is now scaled by the live
aspect against a `REFERENCE_ASPECT` of `1.6`. At `1440×900` the factor is
exactly `1`, so the authored desktop path is untouched; every other width now
lands on the same framing instead of its own:

| waypoint | origin x before: 1440 / 1024 / 390 | after: 1440 / 1024 / 390 |
|---|---|---|
| about | `-0.068` / `-0.087` / `-0.236` | `-0.068` / `-0.069` / `-0.070` |
| experience | `-0.062` / `-0.080` / `-0.216` | `-0.062` / `-0.063` / `-0.064` |
| skills | `+0.077` / `+0.099` / `+0.268` | `+0.325` / `+0.325` / `+0.325` |

The sharpest confirmation is a symmetry one, because it cannot be read two
ways. Experience and Projects are built as symmetric corridors — plates on
both sides, meant to meet both page gutters equally. Comparing how much of
each section's object layer falls in the outer 3% strip on the *left* against
the *right*, at `390×844`:

| section @390 | left / right before | after | gap before → after |
|---|---|---|---|
| experience | `0.179` / `0.049` | `0.181` / `0.179` | `0.130` → **`0.002`** |
| skills | `0.042` / `0.021` | `0.019` / `0.017` | `0.021` → **`0.002`** |

Before, the phone was seeing a symmetric object composed asymmetrically — the
left plate cut, the right one barely reaching. After, both edges read the same.
Note this means Experience's *right*-edge share rises, `0.049` → `0.179`: taken
alone that looks like a regression, and it is the opposite. The plate was
always meant to meet that gutter; the old pose had swung it off.

Vertical is deliberately left alone: `fov` being vertical means `y` is already
viewport-independent, and correcting it would be inventing a problem.

**L5-3 — Skills is the only section family with no screen-fraction placement at
all, and it is the one the camera has to frame.** Measured as the share of a
section's object layer falling inside the reading column, at `1440×900`:

| section | atelier | observatory | garden | blueprint |
|---|---|---|---|---|
| **skills** | **0.961** | **0.964** | **0.989** | **0.740** |
| projects | 0.141 | 0.075 | 0.257 | 0.569 |
| experience | 0.226* | 0.141 | 0.187 | 0.163 |

\* atelier's Experience first read `0.762` — a capture artifact, not a score;
see *Verification*.

A uniform wash would score `0.789` — the column's own width. Three of the four
Skills variants score *above* that: the node field is not merely failing to
clear the type, it is concentrated on it. Confirmed in the captures, where a
node sits on the "l" of "Tools I reach for" in atelier and on "where it sits"
in observatory. Nothing under `src/three/objects/skills` imports
`scene-layout.ts`, unlike hero, all four projects variants, experience and
drifters.

Part 2 routed this here with `PATH[2]`'s `lookAt` named as the lever, and it is
the right one — but only because the alternative is worse, not because it is
sufficient. The field spans `0.68` of a half-width between cluster centres
against a gutter of `0.21`; no translation can clear a column four times
narrower than the thing crossing it. What the aim *can* buy is the heading:
moving it from `-0.25` to `-1.3` (the dolly stays where it is — this is aim,
not a second lean) puts world origin at `+0.325` and slides the field's
worst-case node from NDC `-0.40` to `-0.15`, clear of the `<h2>`'s right edge
at `-0.28`. The lede, which runs to `+0.08`, is still crossed. Recorded as
residual rather than claimed as fixed.

**L5-4 — Contact's waypoint was a copy of Hero's, on the one section whose page
is not a centred column.** `PATH[5]` repeated `position: [0,0,*]`,
`lookAt: [0,0,0]` with a longer lens, and Contact's DOM is two columns —
details left, an opaque form card from the middle of the frame rightward. The
result is the literal case the path's own comment names: `contact-calm.tsx`'s
dodecahedron sits at world origin, which is NDC `0`, which is behind the card;
roughly 60% of the object is occluded by it. The object is compact enough for
the camera to place (`0.33` of a half-width wide against a free band of `0.53`
between the two columns), which is exactly the case Skills is not. The aim
drifts to `1.4`, settling the core at NDC `[-0.45 .. -0.10]` inside that band.
Nothing follows this waypoint, so the drift also reads as the release the lens
was already doing.

**L5-5 — Hero's form was cut by the frame's right edge at every viewport.**
`composition.ts` centres the form on the free edge, which fills it exactly and
so puts the silhouette's outer edge *on* the frame's; once `fit` bottoms out at
`MIN_FIT` the form is wider than the edge it is centred in and simply hangs
off. Measured at the right frame edge in NDC: `1.00` at `1440×900`, `1.18` at
`1024×820`, `1.66` at `390×844`, with blueprint's bounding cage worst at
`1.93` — half the object outside the frame. On the rendered page at
`1440×900`, 6.6% of Hero's object layer sat in the outer 3% of the right edge
against 0% on the left. The camera is **not** the lever and the arithmetic says
why: the placement is a screen *fraction*, so widening the lens or pulling the
dolly back scales the world and the form together and the composition does not
move. It is fixed where it lives, as a margin — `EDGE_MARGIN`, 4% of a
half-width, which the centre pulls back to honour. Where the gutter is real the
form still fills it (the margin costs atelier `0.04` of a half-width and 4% of
its `columnPresence`); where there is no gutter the form keeps its size and
falls to `COLUMN_FLOOR` as designed, but now does it inside the frame.

**L5-6 — The one camera move on a wall clock was the one integrating unclamped
delta.** Every damped loop in `src/three` reads `clampDelta` — all four skills
variants, all four projects variants, experience, drifters, scroll-physics —
except `camera-rig.tsx`, which is where the Inspect hand-back lives. That
blend is the rig's only non-scroll-driven motion and the only place a raw
`delta` can do real harm: a tab-return spike lands the whole `RELEASE_DURATION`
in a single frame, turning the 0.6s blend that exists to prevent a cut into a
cut. Now clamped, like everything else.

### Verification

**Offline, through a real camera.** Every NDC figure above comes from
constructing a `THREE.PerspectiveCamera` with the waypoint's `position`,
`lookAt` and `fov` at a given viewport and projecting the section's actual
object coordinates through it — not from reading the numbers and reasoning
about them. That is what caught L5-1: the path *looks* like it leans, and the
projection says the `lookAt` takes the lean back.

**On the rendered page.** 6 cells × 6 sections, before and after, one script
run both sides (project-local Playwright 1.63 / Chromium, as Parts 2–4:
scenery + theme seeded via `localStorage` before app code runs, ≥22s settle
then 20s per scroll, scroll to `block: "center"`, `"Compiling"` asserted
absent). Cells: all four sceneries at `1440×900` plus `atelier` at `390×844`
and `blueprint` at `1024×820`, which are the widths L5-2 and L5-5 are about.
Each section is captured twice — once normally, once with the canvas hidden —
and the per-pixel difference between the two *is* the 3D layer, which is then
measured against the reading column and the section's own text boxes.

*The before matrix was re-captured for four cells.* The first pass overlapped
an edit to `camera-rig.tsx`, the dev server hot-recompiled mid-run, and those
cells recorded the new camera as the baseline. They were re-run against a
clean revert. The existing four traps in `CODEBASE_MAP.md` §8 did not cover
it — unlike trap 3, it leaves no trace, because by capture time the overlay
is gone and `compiling` reads `false`. Added there as a fifth trap: **do not
edit source while a capture matrix is running.**

Where the change is isolated enough for a pixel metric to see it, the metric
agrees with the projection:

| | before | after | predicted |
|---|---|---|---|
| hero @390, share in outer 3% right strip | `0.231` | `0.000` | `0` |
| hero @1024 blueprint, share in outer 3% right strip | `0.256` | `0.000` | `0` |
| hero @390, object pixels drawn | `1989` | `3144` | more |
| about @390, share in outer 3% right strip | `0.522` | `0.000` | `0` |
| about @390, object bounding box, right | `1.00` | `0.95` | `≤0.98` |
| contact, object centroid x (observatory) | `0.444` | `0.359` | `0.36` |
| about, share in outer 3% right strip (observatory) | `0.084` | `0.000` | `0` |
| skills, object centroid x (atelier / observatory) | `0.547` / `0.518` | `0.598` / `0.540` | rightward |

Hero at `390×844` is the cleanest of these and reads the change twice over:
the edge strip empties, *and* 58% more of the form is drawn, because the part
that used to hang off the viewport is now inside it. Blueprint at `1024×820`
was L5-5's worst case at NDC `1.93` — its wireframe cage now closes inside the
frame with its dimension lines intact, which the capture shows and the empty
edge strip confirms.

Skills moves less than the `+0.125` of a frame width the aim buys, because the
metric is computed on what survives clipping: nodes pushed past the right edge
leave the measurement and pull the centroid back with them. The claim the
change actually makes is heading clearance, and that is read off the capture,
not the centroid.

*Two metrics that do not answer this question, recorded so they are not
re-read as evidence.* `edgeRightShare` measures the outer 3% strip while
`EDGE_MARGIN` is 4%, so a silhouette that now stops cleanly at `0.98` still
registers in it — Hero's atelier reading *rises* `0.066` → `0.085` for the
good reason that those pixels were previously clipped off-frame rather than
drawn. And `textEnergy` is timing-sensitive in the way `CODEBASE_MAP.md` §8
trap 2 describes: `atelier-light-1440/experience` read `65871` before and
`2530` after, with an `objColumnShare` of `0.762` — almost exactly the `0.789`
a full-frame wash scores — because that capture caught Projects' corridor
still standing over Experience. The after value is the true one, and the
`0.762` in L5-3's table is the same artifact; the other three worlds
(`0.141` / `0.187` / `0.163`) are what Experience actually scores.

**Quaternion/lerp discipline, confirmed unchanged (§0.1).** The rig still
poses the camera by writing `scratchPosition`, calling `camera.lookAt`, and
`slerpQuaternions` toward the result — no Euler is accumulated anywhere in
`camera-rig.tsx`, and none of this part's edits introduce one. `CameraRig` and
`InspectControls` remain the only two writers of the camera, they never run in
the same frame (the rig returns early while `inspectActive`), and Inspect is
still reachable from exactly one place: `plansheets.tsx`, the blueprint
Projects variant (§6.3). Scroll remains the sole driver everywhere else —
nothing added here reads a clock except the Inspect hand-back, which already
did and is now clamped.

**Browser matrix — 6/6 cells clean.** Every cell reported **0 page errors, 0
console errors**, correct `data-scenery`, correct theme class, a live canvas
and six sections, on both the before and the after run.

**Static gates (Part 15.6, checked fresh).** `npm run typecheck` — **15
errors**, identical to Part 1's count and every one in the admin tree
(`analytics/*`, `ripple-toggle.tsx`, `settings-form.tsx`); **0 in either file
this part touched**. `npm run lint` — **277 problems (28 errors, 249
warnings)**, identical to the Part 1 baseline and to Parts 3 and 4.
`composition.ts` does not appear in the lint output at all; `camera-rig.tsx`'s
two entries are the pre-existing `react-hooks/immutability` pair on `useFrame`
writing `camera.fov`, which is what an R3F camera rig is for and which this
part neither introduced nor widened.

### Intentionally left unchanged

- **One camera path for all four sceneries.** The obvious "fix" is a per-world
  path, and it is wrong: the sceneries are a change of material and light, not
  a change of place, and §3 wants them as data rather than as four code paths.
  A visitor switching worlds mid-scroll should find the same room lit
  differently, not be re-seated. Every per-world difference belongs in the
  object files, which is where it already is.
- **The vertical track.** `fov` is vertical, so the frame's world half-height
  is identical at every viewport and the path's `y` is already
  viewport-independent. Scaling it the way `x` is now scaled would invent a
  problem. Only the lateral track takes `lateral`.
- **Skills' lede is still crossed.** The aim buys the `<h2>` and nothing more
  (L5-3), and at `390×844` it buys only that: the heading stays clear, but the
  node field spans the whole frame and sits across "bring it forward and see
  where it sits" — `objColumnShare` `0.945` against a column of `0.900`, the
  same above-a-uniform-wash signature as the desktop, worse because the frame
  is narrower than the field at any aspect. This is the one deferral Part 5
  received that it cannot discharge. Clearing the lede needs the node field to
  read `scene-layout.ts`, which is a change to four object files and their
  layout module, not to the camera — beyond what Part 5 owns. Recorded here so
  it is picked up where it belongs rather than forgotten.
- **Garden's leaf reading** (deferred here by Part 3). Re-checked against the
  after-captures, and the framing half of it is already answered: with
  `EDGE_MARGIN` the whole rosette now sits inside the frame, and the fan reads
  — two leaves present their face, the rest foreshorten because they radiate
  from a common crown. That foreshortening is the object's construction, not
  the pose; turning it would mean tilting the shared path for one variant of
  one section, which is the trade L5-3 already refused. It belongs to
  `foliage.tsx`.
- **The six waypoints themselves, as a count and as a rhythm.** They are
  per-section by construction (`SCENE_SECTION_COUNT`), each span eased by
  `easeInOutSine`, which is C¹-continuous at the joins — so the camera arrives
  and settles at each section rather than snapping between poses. That reads
  as deliberate and was left alone; only two aims and the aspect handling
  changed.
- **`RELEASE_DURATION`, `PARALLAX_X/Y`, `ENTRY_SETTLE`, `EXIT_HOLD`.** Tuned
  values with no measured defect. The parallax throw needed a correction, not
  a retune — `0.18` now means the same thing everywhere instead of meaning
  four different things.
- **Timings** — still blocked, no GPU in this sandbox (Part 1's *Deferred*).

---

## Part 6 — DOM ↔ WebGL coordination  `[x]`

For Skills and Projects in each scenery, trace the chain:

```
DOM interaction (hover/click on a pill or card)
      ↓ scene-interaction-store.ts
3D reaction (facing, lighting, emissive, orbital phase)
      ↓
the interaction is still understandable with WebGL off
```

Check specifically: does hovering a skill pill in the DOM visibly do
something in the canvas for *every* scenery (constellation glow, orrery
front-alignment, vine bud morph, schematic trace pulse) — or only in the
ones built first? Does a project card's hover/click feel connected to its 3D
counterpart (monolith drag, foliage lift, plan-sheet raise), or do DOM and
WebGL feel like two unrelated layers that happen to share a scroll position?
`hoveredProjectId` in `scene-interaction-store.ts` has a documented history
of being a dead field (Phase J's notes) — verify each scenery actually reads
live interaction state rather than a stale store field.

### Part 6 — Findings and fixes (2026-09-21)

The brief's second question answers itself, and the answer was **two unrelated
layers that happen to share a scroll position** — for Projects. Skills was
already connected in all four worlds; Projects was connected in none.

**L6-1 — `hoveredProjectId` was still a dead field, and the reason is
geometric, not an oversight.** The store declared `hoveredProjectId` and
`setHoveredProjectId` in Phase J and **nothing anywhere called the setter** —
the whole repo, one grep, zero writers. Every Projects variant instead resolved
hover from its own screen-space pick. That pick can never agree with a card,
because the two things live in different parts of the page: the slabs are
pinned in the **gutters** (`panelFrac * halfW`, outside the content-safe
fraction), and the cards are in the **content column**. So hovering a card lit
nothing, and the deck lit up only once the cursor had left the content
entirely — the reaction fired precisely when the reader had stopped looking.
`foliage.tsx:252` had the gap written in a comment and left it. Fixed by giving
the card the job the canvas cannot do: the canvas is `pointer-events-none` and
cannot raycast a card, so `project-card.tsx` and `plansheet-card.tsx` now
publish `project.id` on enter/leave, on the same imperative-store pattern
`tech-marquee.tsx` has used since Phase J.

**L6-2 — One rule, not four copies: `src/three/objects/projects/hovered.ts`.**
Four variants resolving "which slab is attended to" four times is four chances
to drift. `hoveredSlabIndex(slabs, pick)` states the rule once: **a hovered
card is the authority**, and the ray is consulted only when no card is
published. `pick` is a callback, not a value, so the raycast is skipped
entirely on the frames the DOM has already answered.

**L6-3 — A card with no slab must light nothing.** The page lists five
projects; a tier draws two to four (`WALL_LIMIT: { low: 2, mid: 3, high: 4 }`),
so on any tier some cards have no 3D counterpart. `findIndex` returns `-1`
there and that `-1` is passed through rather than falling back to the ray. The
fallback is the tempting version and it is wrong: the reader is attending to a
project the deck is not showing, and lighting whatever the cursor happens to be
near instead would be a coincidence dressed up as a response.

**L6-4 — Two of the four Projects worlds had no resting-state reaction at all
to connect.** Auditing what each variant actually does on hover, rather than
whether it reads the store:

| variant | hover language before | after |
|---|---|---|
| `corridor.tsx` (atelier) | full: `HOVER_TURN` yaw, `HOVER_LIFT` on `lift.position.z`, face/edge emissive — all unreachable from the DOM | same language, now reachable |
| `foliage.tsx` (garden) | lift + scale, ray-only | same, card-first |
| `monoliths.tsx` (observatory) | **none** — press-drag only | card hover drives `item.hold` → face/edge emissive |
| `plansheets.tsx` (blueprint) | **none at rest** — click-raise only | `HOVER_NUDGE 0.16` of a raise + `HOVER_INK 0.28` on the border |

Atelier is the sharp case: a complete hover vocabulary already existed and was
simply unreachable. The two additions are deliberately *quieter* than the
existing press states, so "the reader is reading this one" and "the reader has
opened this one" stay distinct (§8). Monoliths brighten without moving —
movement belongs to the grab. Blueprint gets a fraction of a raise and a firmer
line weight, because on a drafting board the quieter of two states is a line
weight, not a move.

**L6-5 — Skills was connected in every world, but only by mouse in two of
them.** All four 3D Skills variants read `hoveredSkillId` live inside
`useFrame` via `getState()` — `constellation.tsx:194`, `orrery.tsx:223`,
`growth.tsx:319`, `schematic.tsx:169` — each with its own distinct reaction, so
the brief's first question ("or only in the ones built first?") is a clean
*no*. But the **DOM** side was uneven: `tech-marquee.tsx` published on
`onFocus`/`onBlur` as well as pointer, while the garden and blueprint pill
lists published on pointer only. A keyboard user in those two worlds got no 3D
reaction at all. Both now publish on focus, matching the marquee.

**L6-6 — An unmounted card never gets its `pointerleave`.** Switching scenery
mid-hover swaps `ProjectCard` for `PlansheetCard`, and the scene would hold a
highlight on a card that no longer exists. Both cards return `withdraw` from a
`useEffect` cleanup. Clears are last-writer-wins (`if (state.hoveredProjectId === id)`),
the same guard the skill pair already used, so a leave arriving after someone
else's enter cannot blank a live highlight. Adding this made
`plansheet-card.tsx` a client component; noted in its doc block.

### Verification

**The DOM half, on the rendered page, in all four worlds.** React 19 keeps an
element's props on the DOM node under a `__reactProps$*` key, which makes
"is the handler actually attached to the rendered element" a deterministic
question a browser can answer — unlike anything pixel-based here. Per scenery
(project-local Playwright / Chromium, `localStorage`-seeded scenery + theme
before app code runs, as Parts 2–5), the probe reads those props off every
`#projects article` and every focusable `#skills button`, then dispatches a
real hover and a real focus:

| scenery | `data-scenery` | cards wired (enter/leave/focus/blur) | pills hover-wired | pills focus-wired | canvas | errors |
|---|---|---|---|---|---|---|
| atelier | `atelier` | 2/2 | 20/20 | 20/20 | live | 0 |
| observatory | `observatory` | 2/2 | 20/20 | 20/20 | live | 0 |
| garden | `garden` | 2/2 | 20/20 | 20/20 | live | 0 |
| blueprint | `blueprint` | 2/2 | 20/20 | 20/20 | live | 0 |

**4/4 cells clean**, 0 page errors and 0 console errors throughout. The
focus-wired column is L6-5's fix measured: before it, garden and blueprint
would have read `0/20` there.

**The pixel instrument was built, measured, and rejected — the number is
recorded so it is not rebuilt.** The first verification was a gutter-strip
pixel diff between a settled no-hover state and a settled hover state, carrying
its own control (forced `low` tier so the last card provably has no slab, whose
hover must therefore change nothing). It does not work in this sandbox. Two
captures of the *same resting gutter*, 12s apart, cursor parked off every
target, differ in **24.28% of their pixels** — the drifters and the atmosphere
shader never stop, and with no GPU (SwiftShader, ~250ms/frame) they never
converge either. The abandoned run's own matrix says the same:

```
atelier      hover-first[L44.667% R33.727%] released[L40.054% R22.671%] hover-last[L41.14% R52.822%]
observatory  hover-first[L35.034% R16.492%] released[L19.894% R16.087%] hover-last[L21.894% R36.388%]
```

`released` is the tell: the cursor is back at rest and 20–40% of the gutter has
still changed, with max delta saturated at 697. A hover's contribution sits far
under that noise floor, so **no** reading from this instrument distinguishes
signal from drift, including a reading that happens to look right. It is an
unusable instrument here, not a failed result, and it was killed rather than
reported. The 3D half of this part is therefore verified by construction and by
code path — the store read, the `-1`, the handler attachment — and the *look*
of the four reactions is deferred to a GPU, with Part 1's *Deferred* timings.

**Frame-loop discipline, confirmed unchanged (§0.1).** Every new read is
`useSceneInteractionStore.getState()` inside `useFrame`, never a subscription —
a hover still causes zero React re-renders in the canvas, which is the whole
reason the store is the seam. `hovered.ts` adds no state and no per-frame
allocation; the `pick` callback means a published card *removes* a raycast from
the frame rather than adding one.

**Static gates (Part 15.6, checked fresh).** `npm run typecheck` — **15
errors**, identical to Part 1's count and every one in the admin tree
(`analytics/*`, `ripple-toggle.tsx`, `settings-form.tsx`); **0 in any of the
nine files this part touched**. `npm run lint` — **277 problems (28 errors, 249
warnings)**, identical to the Part 1 baseline and to Parts 3, 4 and 5. The six
errors ESLint reports inside touched files are the pre-existing
`react-hooks/immutability` complaints about KTX2 `colorSpace` assignment in
`foliage.tsx` and `monoliths.tsx`, which this part neither introduced nor
widened.

### Intentionally left unchanged

- **The raycast fallback in `corridor.tsx` and `foliage.tsx`.** A card is the
  authority, but with no card hovered these two still answer the cursor, and
  that is worth keeping: in atelier and garden the slabs are large and close
  enough to the reading edge that sweeping past them *should* acknowledge it.
  Observatory and blueprint deliberately have no fallback (`() => -1`) because
  their variants never raycast continuously — monoliths answer a press,
  plansheets answer a classified release. Removing the fallback everywhere for
  symmetry would delete a real reaction to buy a tidier rule.
- **Click, as distinct from hover.** The brief asks about "hover/click", and
  click is already connected in both worlds that have a click language: the
  monolith grab and the plan-sheet raise/Inspect both run off `scene-pointer`'s
  `wasClick` classification. Routing those through the store too would mean the
  DOM card's *link navigation* competing with the 3D object's press state for
  the same gesture, which is §8's "one gesture, one meaning" violated on
  purpose. Hover is the state that needed a bridge; click already had one.
- **Touch.** `publishHoveredProject` applies the same fine-pointer gate as
  `publishHoveredSkill`, so none of this fires on touch. A tap on a card is a
  navigation, and a highlight that appears at the moment the page is leaving is
  noise. Unchanged, and deliberately.
- **`WALL_LIMIT` itself.** The mismatch between five cards and two-to-four
  slabs is what makes L6-3 necessary, and raising the limit to close it would
  trade a correctness question for a budget one. The deck is a suggestion of
  the work, not an index of it; `-1` is the right answer, not a symptom.
- **The four reactions' magnitudes.** `HOVER_NUDGE`, `HOVER_INK` and the
  `item.hold` contribution are first values chosen against the existing press
  states, not tuned against a rendered frame — see the deferral above. They are
  intentionally on the quiet side, which is the safe direction to be wrong in.
- **Timings** — still blocked, no GPU in this sandbox (Part 1's *Deferred*).

---

## Part 7 — The scenery crossfade  `[x]`

[scenery-transition.ts](src/lib/experience/scenery-transition.ts) already
implements the 900ms GSAP timeline: exposure → palette → lights → geometry
commits at `DURATION × {0.14, 0.3, 0.46, 0.6}`, hidden under a `veilTargets`
opacity dip on the canvas wrapper and ambient backdrop. *(Those four
offsets are Phase K's, as this brief found them; L7-3 below retimes them.)* Phase K's own notes
flag that the ≤900ms / ≤32ms-frame half of its accept criterion was never
verified against a GPU-backed browser (only measured in a headless
software-rasterizer sandbox). **That measurement is Phase L's job, not
optional colour.** Run it in a real browser across all twelve ordered pairs
and record actual numbers.

Beyond the number, judge the *feel*: does it read as one world dissolving
into another, or as a flash of empty veil followed by a hard cut? If
mechanical, retime the existing four commit offsets or adjust `veilTargets`
easing — do not add new interpolated tracks (§17: no new colour/number
interpolation beyond what's there).

### Part 7 — Findings and fixes (2026-09-21)

Driven with three scripts now kept in [scripts/phase-l/](scripts/phase-l/), so
the GPU re-run this sandbox cannot do is one command elsewhere. All three
report **DOM state** — `data-scenery`, the picker's `aria-label`,
`localStorage`, and computed veil opacity read at a `MutationObserver`
callback. That distinction is the whole reason Part 7 could be closed here:
those reads stay true under SwiftShader, where every wall-clock figure does
not.

#### L7-1 — P0 · a second pick mid-crossfade could strand the world on the abandoned scenery

`runSceneryCrossfade` opened with `if (fromId === toId) return;`, and the store
passes `renderScenery.id` as `fromId`. `renderScenery.id` does not become the
target until the **geometry** commit at 44% of 900ms, so for the first ~400ms
of every switch it still reads as the world being left. Re-pick that world in
that window — an ordinary "no, go back" — and the guard saw `from === to`,
returned before `activeTimeline?.kill()`, and left the abandoned timeline
running. It then committed its own target on top. The picker, the `aria-label`
announcement and `localStorage` all said one scenery; the screen showed
another, permanently.

Reproduced on a build with the fix stashed (`switch-interrupt.mjs`, both picks
in one page task so the second provably lands pre-geometry):

| Case | Expect | `data-scenery` | Picker label | `localStorage` |
|---|---|---|---|---|
| atelier → garden, then atelier | atelier | **garden** | atelier | atelier |
| blueprint → observatory, then blueprint | blueprint | **observatory** | blueprint | blueprint |

This is Part 1's *Unresolved* item, now triaged: the harness there switched
sequentially in one context, which performs exactly this gesture.

**Fix.** The guard now asks where the screen is *headed*, not where it is.
`scenery-transition.ts` tracks `pendingId` — the in-flight timeline's target -
and returns only when `(pendingId ?? fromId) === toId`. One guard closes both
halves: re-picking the world being left now kills the abandoned timeline and
crossfades back to it, and re-picking the world already being transitioned *to*
now returns instead of killing and restarting a timeline that was already going
there. After: **5/5**, and the rewind cases no longer flash the abandoned world
at all (`path=atelier`, not `atelier→garden→atelier`).

#### L7-2 — P0 · `setSceneryInstant` left a killed timeline's veil down

`setSceneryInstant` (hydration, and `pinAtelier` when the `three-scenery` admin
flag goes off) replaced `renderScenery` without touching an in-flight timeline.
A flag flip mid-crossfade therefore left the abandoned timeline to commit its
target afterwards, and — because `kill()` skips `onComplete`, where the
`clearProps` lives — could leave the canvas and the ambient backdrop pinned at
`VEIL_FLOOR`, i.e. the whole site at 8% opacity with nothing to lift it.

**Fix.** `cancelSceneryCrossfade()` in `scenery-transition.ts`: kill, clear
`pendingId`, clear the veil. Called from `setSceneryInstant`.
**Not driven end to end** — the trigger is a server-resolved admin flag
changing mid-gesture, which the harness cannot stage. Fixed by construction and
recorded as such rather than claimed as verified.

#### L7-3 — P2 · the geometry commit was revealed, not hidden — 7 of 12 pairs, twice at full opacity

The feel question, answered with a number. `veilAtCommit` is the veil's opacity
at the instant `data-scenery` flips, and on Phase K's timing (geometry at 0.60,
reveal starting at 0.64) the two were 36ms apart — barely one frame. Any
dropped frame merges them, and the heaviest commit in the transition (variant
remount, fresh geometry, fresh materials) lands in full view:

```
BEFORE  veilAtCommit, twelve ordered pairs
  0.081  0.084  0.094  0.126  0.403  0.620  0.768  0.848  0.848  0.970  1.000  1.000
         +-- 5 hidden --+     +------------ 7 revealed, two completely ------------+
```

Two pairs swapped the entire world at opacity **1.0**. That is precisely the
brief's "a flash of empty veil followed by a hard cut", and it was never a
matter of taste.

**Fix, in two parts, both inside the existing timeline — no new track.**

1. **Retime.** Same four commits in the same order; the gap after `geometry`
   widens from 36ms to 144ms (`0.14/0.30/0.46/0.60` → `0.20/0.28/0.36/0.44`,
   reveal from `0.64` → `0.60`). The dip also widens `0.12 → 0.18` and eases
   `power2.out → power2.inOut`, so the world dissolves rather than blinking
   out and easing into a floor it has already reached.
2. **`addPause` at the geometry offset.** Retiming alone is a scheduled offset,
   and a scheduled offset does not survive a dropped frame: one GSAP tick
   spanning 0.44→0.60 fires the commit and renders the reveal together. The
   commit now runs from an `addPause` callback that resumes the timeline on the
   next `requestAnimationFrame`, so the new world is guaranteed a whole frame
   behind the veil. It costs nothing when frames are healthy.

```
AFTER   veilAtCommit, twelve ordered pairs
  0.08 x 12      every pair commits at the floor
```

12/12, measured under 350ms-1.5s frames — the worst conditions available here,
and strictly harder than a GPU.

### Verification

| Suite | Result |
|---|---|
| `switch-pairs.mjs`, twelve ordered pairs | **12/12** land correct (`data-scenery`, picker label, `localStorage` agree); **12/12** `veilAtCommit = 0.08` |
| `switch-interrupt.mjs`, five interrupt cases | **5/5** after (**3/5** with the fix stashed) |
| `switch-reduced.mjs`, reduced motion | **4/4** — all four commit in the same task (0.8–8.5ms), no veil opacity written at all |
| `npx tsc --noEmit` | **15 errors**, all pre-existing in the admin analytics tree; none in a file this part touched |
| `npm run lint` | **277 problems (28 errors, 249 warnings)** — the recorded baseline, unchanged; both touched files clean |

**The ≤900ms / ≤32ms-frame half of Phase K's accept criterion is still not
satisfied**, and Part 16's Performance box stays unticked. This sandbox has no
GPU; the recorded wall-clock is provenance only (commit 946–6494ms, settle
1235–6989ms, max rAF gap 295–1609ms, median frame 39–355ms), and it tracks the
*renderer* rather than the timeline — garden's cells run ~350ms/frame against
blueprint's ~41ms. What Part 7 changes is that the re-run is now one command
with a pass/fail line, rather than a protocol to reconstruct.

### Intentionally left unchanged

- **`DURATION`, and the four-commit structure.** 900ms is §12's switch budget
  exactly, and exposure → palette → lights → geometry is §9's ordering.
  Only the offsets within it moved.
- **`VEIL_FLOOR = 0.08`.** Deepening the dip would hide more, and would also
  make the transition read as a fade to black between two worlds rather than
  one dissolving into the other. The measured problem was *when* the commit
  landed, not how dark the veil got — 0.08 was never the failing variable.
- **Blended colour and light.** The commits still snap; the veil is still what
  makes that read as nothing. §17 forbids new interpolation tracks, and L7-3
  shows the veil does the job once the commit is actually under it.
- **The two veil targets.** Canvas wrapper and ambient backdrop, per S13. The
  probe confirms both are registered in every pair (`veilCount: 2`).
- **Restarting on a repeat pick.** Re-picking the in-flight target is now a
  no-op rather than a restart, which is a behaviour change — but the old
  behaviour was a visible re-dip of a transition already going where the user
  asked, and nothing depended on it.

---

## Part 8 — Interaction states  `[x]`

For every registered-interactive object (`scene-raycaster.ts`'s
`registerInteractive` registry — drifters, monoliths, foliage leaves,
blueprint plan sheets): confirm a resting state that's quiet, a hover that's
immediate but subtle, a selected/active state that's unambiguous, and a
release/exit that settles via `springStep` rather than snapping. Drag
(`observatory` monoliths) should feel physical — plane-intersection drag with
velocity-based release, already spec'd in §6.4 — confirm the momentum reads
as momentum, not as teleporting to the release position.

### Part 8 — Findings and fixes (2026-09-21)

Four registered-interactive families, one question each: what does the object
do when the cursor is merely *near* it, and what does it do when it is
*taken*. Three of the four could not answer the first question at all — they
had one state, and it fired on press. Driven with
[interaction-states.mjs](scripts/phase-l/interaction-states.mjs), which reads
only the **DOM half** of the interaction (the computed cursor, and the
`.scene-grabbable` class the raycast writes) and so stays true under
SwiftShader.

#### L8-1 — P0 · blueprint's click-to-raise was dead whenever the drifters flag was off

`scene-canvas.tsx` registered `usePointerPress` on `grabEnabled`, and
`grabEnabled` was `driftersEnabled && finePointer`. But `scenePointer` is not
the drifters feature: monoliths drag from it (§6.4), plansheets classify a
click from it (§6.2), and foliage now answers a press from it. Turn
`three-drifters` off in `/admin/settings` — an ambient-background toggle with
no stated relationship to Projects — and every plan sheet in the blueprint
scenery silently stopped raising. Nothing logged, nothing looked broken: the
sheets simply never responded.

**Fix.** The press listeners now register for any non-corridor Projects
variant as well:
`usePointerPress((grabEnabled || (pressVariant && finePointer)) && !reducedMotion)`.
Corridor is the only variant that reads no pointer press, so it is the only
one excluded. Touch and reduced motion still opt out, unchanged.

#### L8-2 — P1 · drifters were grabbable with no sign that they were

The largest gap against the brief. A drifter's resting state was quiet — and
stayed quiet right up until the press landed, because the layer raycast
**only** on `pressStamp`. There was no hover at all. The affordance was
therefore undiscoverable: the drifters read as scenery until you happened to
click one, which is not something a visitor does to a background.

**Fix, in three pieces, no new systems.**

1. `createHoverPicker()` in `scene-raycaster.ts` — `pickNearest` behind §6.2's
   two throttles. It rays at most every other frame (off frames return the
   cached hit, so a held hover does not flicker), and not at all while the
   page is scrolling fast. A factory rather than a module singleton because
   the cache is per-caller: drifters and a Projects variant ray in the same
   frame, and a shared cache would hand one the other's answer.
2. `setSceneGrabbable()` in `scene-pointer.ts`, plus
   `.scene-grabbable { cursor: grab }` in `globals.css` — the DOM sets the
   cursor, the WebGL layer never does (§6.2). Scoped to `body`, never
   `body *`, so a link or a field keeps its own cursor when a drifter passes
   behind it. Guarded on change, so the frame loop can call it every frame and
   touch the DOM only on transitions.
3. A `hover` channel on `DrifterRuntime`, `damp`ed on `tight`, with every
   hover number a deliberate fraction of its `hold` counterpart: spin `+0.45`
   against hold's `+6`, scale `+6%` against `+22%`, emissive `+0.12` against
   `+0.5`. `notice = hover * (1 - hold)`, so the offer cross-fades out as the
   answer arrives instead of stacking on it. The hover ray is polled at rest
   only — under a press the grabbed drifter owns the reaction.

#### L8-3 — P1 · the one continuous raycast on the page ran ungated

Garden's foliage was the only family with a real hover, and it paid for it
with an unthrottled `pickNearest` on every frame of every scroll — including
the fast flicks where §6.2 calls the scroll gate "the single most important
line in the file for scroll performance". That gate existed in the DOM
(`SCROLL_SUSPEND_VELOCITY`) and had no frame-loop counterpart, because
`sceneScroll` published only `progress`.

**Fix.** `<ScrollPhysics>` already integrates the rail spring, so it now
publishes `sceneScroll.velocity` alongside `progress` — read off that spring,
not re-derived, because §17 makes a second integrator a design error.
`SCROLL_RAY_SUSPEND = 1` is the frame-loop twin of the DOM's `0.5`: that hook
measures `useVelocity(scrollYProgress)` halved, so the two numbers are one
gate stated in each layer's own units. Foliage's pick is now
`createHoverPicker()` and inherits both throttles.

#### L8-4 — P2 · monoliths glowed the same for "reading this one" and "holding this one"

Part 6 routed the card hover into `item.hold`, the same channel the drag
writes. Its own note claimed to be preserving the distinction between an
attended monolith and a grabbed one; the code collapsed them into one glow at
one intensity.

**Fix.** `MonolithRuntime` gains `hover`, separate from `hold`. Hovered firms
the accent **edge** alone (`+0.5`) — no face light, no scale, no move. Held
lights the face (`+0.4`), drives the edge harder (`+1.2`), and grows the
monolith 3%. `notice = hover * (1 - hold)`, as in the drifters, so picking up
what you were reading is a transition rather than a sum. Observatory still
does not raycast on hover: a monolith answers a press, and the resting
acknowledgement arrives from the card — §8's "immediate but subtle", sourced
from the DOM.

#### L8-5 — P2 · a foliage leaf accepted a press and showed nothing

Leaves hovered, lifted and turned. Pressing one did nothing at all until
release, when the navigation fired. The active state the brief asks to be
*unambiguous* was simply absent.

**Fix.** A `press` spring on `LeafRuntime`, on `settle`. Garden's answer to a
press is to **give**, not to open something: the leaf yields (`-9%` scale
against hover's `+8%`, so a press visibly reverses the hover rather than
extending it), turns fully to face front, and brightens `+0.35`. `settle` is
ζ≈1.0 over ~600ms, so the release unwinds rather than snapping — the brief's
requirement, met by an existing spring rather than a new one.

#### L8-6 — P2 · a raised plan sheet survived leaving the section

`raised.current` persisted across section exit. Scroll away from Projects with
a sheet up, come back, and it was still up — the page remembering a selection
the reader has no record of making. A raise is a *reading* state.

**Fix.** `if (presence < 0.5) raised.current = -1;`, evaluated while the deck
is still on screen, so the sheet visibly lowers on the same `gentle` spring a
click would have used, instead of resetting out of view.

### Verification

| Check | Result |
|---|---|
| `interaction-states.mjs` — `grabCursor` | **`grab`** at a drifter hit point; before Part 8 no cursor state existed at all |
| `interaction-states.mjs` — `linkCursor` | **`pointer`**, unchanged, while `.scene-grabbable` is set — the body-only scope holds |
| `interaction-states.mjs` — `dragCursor` | **`grabbing`** — the press promotes the cursor, so hover and hold are distinct in the DOM too |
| `interaction-states.mjs` — `suspended` | **true** — the class clears during a flick, i.e. §6.2's scroll gate fires |
| `interaction-states.mjs` — `released` | **true** — a fresh sweep finds hover again once scroll settles; the gate suspends, it does not latch |

All six from one run, hit point `(1240, 23)`, headless Chromium at 1440×900 —
which tiers as `low`, so only three drifters exist to find. The sweep walks the
`LANES` rows rather than a blind grid, and skips any point sitting over a link
or a field, where `grabAllowed` is correctly false and a press would be
correctly ignored.
| `npx tsc --noEmit` | **15 errors**, all pre-existing in the admin tree; none in a file this part touched |
| `npm run lint` | **277 problems (28 errors, 249 warnings)** — the Part 7 baseline, unchanged |

**Momentum is confirmed by construction, not by measurement.** Both drags
already carry velocity into the release spring: `monoliths.tsx` writes
`item.angle.velocity = (next - value) / delta` on every held frame and hands
it to `springStep(…, "settle")`, and `drifters.tsx` follows the hand on
`snappy` then releases on `settle`, so the spring's own accumulated velocity
*is* the throw. Neither release recomputes a position, so neither can
teleport. Judging how that *feels* under a 250ms frame is not possible here,
and is not claimed.

The probe's own timings are provenance only. `DWELL` defaults to 800ms per
sample point because the every-other-frame gate needs two frames and a
SwiftShader frame costs ~250ms; on a GPU the same sweep is correct at a
fraction of that.

### Intentionally left unchanged

- **Observatory does not hover-raycast.** §4.2 makes the monoliths objects you
  reach for, not surfaces that light up as you pass. The card hover supplies
  the resting acknowledgement; a continuous ray would both contradict that
  identity and put a third ray in the frame.
- **Blueprint does not hover-raycast either.** A plan sheet answers a
  classified click (§6.2's 12px/400ms test). Its "hover" is the raise itself,
  which is a larger state than a hover ought to be — which is exactly why it
  must cost a deliberate click.
- **`corridor.tsx` (atelier).** Not in the `registerInteractive` registry: it
  picks by screen-space proximity, so it falls outside this part's stated
  scope and was left alone rather than converted for symmetry.
- **The every-other-frame cadence.** 30Hz for a hover *test*, not for the
  animation — the `damp` on the result still runs every frame, so nothing
  about the motion is halved. Doubling it to 60Hz doubles the only ray cost
  the page has, to resolve a difference no one can perceive.
- **`SCROLL_SUSPEND_VELOCITY` and `SCROLL_RAY_SUSPEND` as two constants.**
  They gate one behaviour, but in different units, and collapsing them would
  leave one of the two layers carrying a magic divisor.

---

## Part 9 — Light/dark × scenery matrix  `[x]`

All eight combinations, per
[SCENERY_SYSTEM_PLAN.md §15's S15](SCENERY_SYSTEM_PLAN.md):

```
Atelier × Light      Atelier × Dark
Observatory × Light  Observatory × Dark
Garden × Light       Garden × Dark
Blueprint × Light    Blueprint × Dark
```

Selector order is fixed (`[data-scenery="x"]` then `.dark [data-scenery="x"]`
overrides). Check each combination independently for text contrast, 3D
contrast against the backdrop, material readability, and accent-colour
legibility. **Do not fix one combination by editing a shared token that the
other seven also read** — a `blueprint` dark-mode contrast fix that changes
`--tone` globally will silently break `atelier` light mode. Scope fixes to
the specific `[data-scenery][.dark]` selector.

### Part 9 — Findings and fixes (2026-09-21)

Two probes, because the matrix has two halves and only one of them needs a
browser.

[palette-matrix.mjs](scripts/phase-l/palette-matrix.mjs) answers the 3D half
offline: every colour the scene paints is derived from `--tone` and `--bg` by
`buildScenePalette` + `applyScenerySkin`, both pure and both free of any
`three` import, so Node's type stripping runs them directly and the whole
8 × 6 grid is arithmetic. No dev server, no settle, and — the point — no
dependence on a rasterizer this sandbox does not have.
[theme-matrix.mjs](scripts/phase-l/theme-matrix.mjs) answers the DOM half in
Playwright: every settled text node's WCAG contrast against its *composited*
ancestor background, plus a screenshot per cell × section.

Thresholds are per role, not one blanket number — a backing plate and an
emissive rim are not the same claim. `accent` 3.0 (WCAG 1.4.11 non-text),
`surface` 2.0, `deep` 1.15, `key`-vs-`surface` 1.4, `--tone`-as-type 4.5.
First run: **56 readings under bar.** After the five fixes below (L9-1 to
L9-5): **clean**, with no threshold moved to get there.

The DOM half is measured against WCAG 1.4.3 directly — 4.5:1 under 24px, 3:1
at or above it — and ends at **360 nodes under bar, from exactly two causes**
(L9-6 and L9-7). Both are reported rather than fixed, and the reasons are the
brief's own: one is a shared token, the other is shared chrome.

#### L9-1 — P0 · two sceneries had no CSS backdrop at all

S13 said each scenery owns the ambient layer and that atelier's rules should
be "namespaced, not redesigned". They were namespaced — *including the
chassis*. `position: fixed`, `inset: 0`, `z-index: -10`, every blob's size and
position, and every `animation-name` all sat inside `[data-scenery="atelier"]`.
So `observatory`, which never got a block at all, and `garden`, whose block
sets only colour and three `animation-duration`s, rendered five unstyled divs
in the normal flow: no backdrop, and in garden's case an `animation-duration`
on an animation that was never named. Four of the eight cells.

**Fix.** Split the block in two along the line it should always have had.
The chassis is now unnamespaced `.ambient` / `.ambient-blob` /
`.ambient-blob-a|b|c` — box, stacking and drift wiring, no look. Shafts and
stars became opt-in (`display: none` by default), which is cheaper than four
blocks each switching the other three off and is what a fifth scenery should
inherit. Atelier keeps its look and renders identically; `garden`'s recolour
and its 52/60/48s durations now actually apply; `blueprint` dropped its
duplicated chassis and gained `border-radius: 0`, which it needed the moment
the base rule started supplying `9999px`.

`observatory` gained the block Phase I never wrote. §4.2 fixes `--bg`
untouched in both themes, so the night is carried by the star field rather
than by darkening the page: on in **both** themes, unlike atelier's dark-only
one, because that is the scenery's identity and not its night mode. On paper
the stars are `--tone`-tinted and steady — white pinpricks would be invisible,
and a twinkle at that contrast reads as a rendering fault.

#### L9-2 — P0 · a hue rotation threw away the contrast ladder it rotated

`globals.css` tunes `--tone` per theme with one stated purpose: *"Light tones
sit at the 700 level so the small mono eyebrow clears 4.5:1 on `--bg`."*
`applyScenerySkin` then rotated that hue for garden and observatory while
holding **HSL lightness**, which does not track brightness across hues. Green
at a given HSL lightness is far brighter than blue at the same one, so the
tuning did not survive the rotation: garden's `contact` accent landed at
**1.95:1** on paper — a token that reads 6.43:1 unskinned — with `hero` and
`work` at 2.25 and 2.13. Dark mode was fine (9.5–16.6:1), which is what made
it a matrix finding rather than a palette one.

**Fix.** Rotate at constant **relative luminance** instead: `atLuminance`
bisects HSL lightness until the rotated colour reads at the original's
luminance. Every skinned accent now lands within ±0.05 of its own token's
contrast, in both themes — the ladder travels through the skin instead of
being discarded by it. Garden light goes 1.95 → 6.43; observatory's cold
accents move onto the ladder too, some up, some down.

#### L9-3 — P1 · the same wobble, one layer down, in `surface`

`surface` held a fixed HSL lightness (`0.31` dark / `0.64` light) for the same
reason and with the same result: the geometry read **1.98:1** against a dark
page under `about`'s violet and **3.46:1** under `stack`'s cyan. Same objects,
same theme, twice as visible in one section as another — and the asymmetry ran
the other way in light mode, where `about` was the *best* cell at 3.69.

**Fix.** Hold `surface` to the luminance a neutral grey at that lightness
would have. Every section now lands at 2.4:1, in both themes — which is what
the existing comment, *"mid-lightness in both themes"*, already claimed.

#### L9-4 — P1 · the depth stack did not exist in dark mode

`horizon` already documents the rule: *"on paper distance goes down in
lightness, on a near-black page it goes up, because there is nothing below
`#0a0a0a` to recede into."* `deep` — the backing plates — never got it, and
sat at an absolute `0.06`. Against a `#0c0a09` page that is **1.01–1.07:1** in
all four sceneries: the plates that carry 12–16:1 of depth on paper are
literally a hole cut back to the page in dark mode.

**Fix.** `deep` takes `horizon`'s rule, `pageLightness + 0.13`, so it reads as
a recess (1.29–1.67:1) while staying clearly behind `surface`.

#### L9-5 — P1 · blueprint's ink was legible on exactly one of the two pages

`skin.lineColor` was a single `#3fb8ff`: **8.95:1** on the dark page,
**2.12:1** on paper. In this scenery the lines *are* the object — unlit
`EdgesGeometry`, no shading to fall back on — so light mode was the whole
world at barely above invisible. The CSS grid backdrop repeated the mistake at
`rgba(63, 184, 255, 0.16)`, effectively unprinted on `#fbfaf9`.

**Fix.** `ScenerySkin`'s two authored-colour fields take a `{ light, dark }`
pair (`ThemedSkinValue<T>`), resolved against `palette.dark` — the same shape
`ThemedIntensity` already uses for light rigs, so it is the file's existing
idiom rather than a new one. Blueprint's ink is `#0a6fb0` on paper (5.15:1)
and `#3fb8ff` on the dark page, and the grid backdrop gets the matching
per-theme rule under `.dark [data-scenery="blueprint"]`. Observatory's
`surfaceLightness` took the same treatment: `0.22` is right on paper (§4.2)
and self-defeating on a `#0c0a09` page, where it put the metal at
**1.49–2.19:1**, the worst reading in the matrix. Dark mode lifts it to `0.44`
(3.07–6.32:1); the key still has to find it.

#### The DOM half: 360 readings, exactly two causes

[theme-matrix.mjs](scripts/phase-l/theme-matrix.mjs) walked all eight cells at
1440×900, six sections each, measuring every settled text node against its
*composited* ancestor background. **360 nodes under bar.** Per cell:

| cell | home | about | skills | projects | experience | contact | total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| atelier × light | 1 | 4 | 69 | 4 | 2 | 4 | **84** |
| atelier × dark | 1 | 4 | 13 | 4 | 2 | 4 | **28** |
| observatory × light | 1 | 4 | 69 | 4 | 2 | 4 | **84** |
| observatory × dark | 1 | 4 | 13 | 4 | 2 | 4 | **28** |
| garden × light | 1 | 4 | 1 | 4 | 2 | 4 | **16** |
| garden × dark | 1 | 4 | 1 | 4 | 2 | 4 | **16** |
| blueprint × light | 1 | 4 | 26 | 15 | 2 | 4 | **52** |
| blueprint × dark | 1 | 4 | 26 | 15 | 2 | 4 | **52** |

Sorting all 360 by ratio collapses them into two causes and no others:

- **208 are `--fg-subtle`**, at exactly four values — `3.70` and `3.85` on
  paper, `4.07` and `3.84` on the dark page, which are the token on `--bg` and
  on `--surface` in each theme. Verified against the token table offline, not
  inferred from the probe.
- **152 are `TechTile` monograms**, spread across `1.35`–`4.11`, and they exist
  only in the sceneries that use the default skills list.

Outside `skills` the picture is even flatter: **all 142 failures in `home`,
`about`, `projects`, `experience` and `contact` are `--fg-subtle`,** in every
one of the eight cells. Nothing else in the site's type ladder misses its bar
anywhere in the matrix.

**The columns that move, move because the DOM differs, not because contrast
does.** `skills` and `projects` are scenery-switched —
[skills-variant-switch.tsx](src/components/skills/skills-variant-switch.tsx)
sends blueprint to the monospace index and garden to the sprouting pill list,
and [project-card-switch.tsx](src/components/projects/project-card-switch.tsx)
sends blueprint to the drafting sheet. So each scenery exposes a different
*quantity* of the same two defects: blueprint's schematic variant is simply the
heaviest consumer of `--fg-subtle` in the codebase (26 in `skills`, and 11 more
in `projects` than any other scenery — its `[ Next.js ]`-style chips and its
"Standard mission" line), while garden's growth list had 25 of its 31 nodes
still veiled at the probe's stop and reports almost nothing. Garden's row is
therefore under-sampled, not clean.

Read down the theme axis instead and the matrix is nearly symmetric: every cell
pair is identical except `skills` in atelier and observatory. That single
asymmetry is L9-7, and it is the only place in the DOM where light and dark
genuinely disagree.

#### L9-6 — reported, not fixed · `--fg-subtle` misses the small-text bar in both themes

`--fg-subtle` is `#8a807a` on `#fbfaf9` (**3.70:1**) and `#78706a` on `#0c0a09`
(**4.07:1**); on `--surface` it is 3.85 and 3.84. The bar for text under 24px is
4.5:1, so the bottom rung of the type ladder misses it everywhere, in both
themes, on both the page and cards. `--fg-muted` clears comfortably at
7.00/7.68 and `--fg` at 17.2/17.7 — the rung below them is the only one short.

**Not a Part 9 finding, and deliberately not fixed here.** It is identical in
all eight cells: not a light/dark asymmetry and not a scenery interaction,
which is what this part is scoped to. Fixing it means moving a shared token,
which is the one thing the brief forbids doing from inside a matrix cell:
*"do not fix one combination by editing a shared token that the other seven
also read."* The fix is a two-value edit in `:root` and `.dark` — holding each
token's hue and saturation and moving lightness only, `#7b726d` (light) and
`#807771` (dark) are the nearest values that clear 4.5:1, both at 4.51 — but it
is a palette decision that belongs to whichever part owns the type ladder,
taken once and re-measured across all eight cells afterwards.

#### L9-7 — reported, not fixed · `TechTile` monograms are a real light/dark asymmetry behind an S18 wall

`skills` in atelier and observatory is the one place where the theme changes
the answer, and it changes it hard: **68 monograms under bar in light, 8 in
dark**, worst **1.35** against **3.65**, over the same 166 settled nodes.
(Those cells' headline 69/13 include one and five `--fg-subtle` nodes
respectively, which belong to L9-6.) That is the shape Part 9 exists to catch.

The cause is in [tech-tile.tsx](src/components/ui/tech-tile.tsx): the monogram
is painted in the technology's raw brand hex over a 16% wash of that same hex.
`getBrandColor` returns unmodified vendor colours, and the table holds both
ends of the range — `#f7df1e` (javascript), `#ffca28` (firebase), `#fcc624`
(linux), `#61dafb` (react), `#a8b9cc` (c) cannot be read on `#fbfaf9`, while
`#0c4b33` (django), `#2d3748` (prisma), `#00599c` (c++) cannot be read on
`#0c0a09`. Neither theme is safe; which half of the table fails flips with the
theme, and the light-failing half is the bigger half — hence 68 against 8.

**Two reasons it is reported rather than fixed.**

1. **S18.** `src/components/ui` is shared chrome: *"a scenery may retint them
   through tokens; it may not fork them, add a variant to them, or animate
   them."* The fix is a component change, not a token change, so no scenery —
   and no part scoped to sceneries — gets to make it.
2. **The severity is lower than the count suggests.** The wrapper is
   `aria-hidden="true"`, and all three call sites
   ([tech-marquee.tsx:124](src/components/skills/tech-marquee.tsx#L124),
   [skill-card.tsx:63](src/components/skills/skill-card.tsx#L63),
   [tech-chip.tsx:33](src/components/ui/tech-chip.tsx#L33)) put the full
   technology name in adjacent `text-fg` or `text-fg-muted` at 7–17:1. The
   monogram carries no information that is not already legible beside it, so
   this is a legibility defect in decoration rather than a 1.4.3 failure on
   content. The probe counts it because it counts every rendered text node,
   which is the right default for a probe that must not be tuned to its own
   results.

**The fix, when someone owns it:** keep the wash as the brand colour and solve
the glyph for contrast against it — the same `atLuminance` bisection L9-2 added
for the 3D half, applied to the monogram's colour instead of its backdrop. One
function, both themes, no per-brand table. `getBrandColor` stays the source of
identity; only the ink derived from it changes.

#### Two caveats on the DOM numbers

**`color-mix()` is invisible to the probe.** `probeSection` parses computed
colours with an `rgba()` regex, and Chromium serializes `color-mix(in oklab, …)`
as `color(srgb …)`, which reads as null. `TechTile`'s wash is therefore skipped
and its monograms are measured against the page rather than against the wash.
For a 16% wash the two are close, so the direction and the 68-vs-8 asymmetry
hold, but the individual ratios in the `skills` rows are approximate. Every
other section is plain `rgb()`/`rgba()` and exact.

**`experience`, and garden's `skills`, are mostly veiled.** `experience`
reports 7 settled against 76 veiled in every cell — its timeline is almost
entirely `<ScrollVeil>` children still mid-entrance at the probe's stop — and
garden's growth list reports 6 against 25. Those nodes are excluded rather than
counted, because a veiled node is not a contrast failure (trap 1 in
CODEBASE_MAP.md §8). They are also not *cleared*: nothing has measured them.
Re-running with a longer `SETTLE` on a real GPU is the way to close that gap.
### Intentionally left unchanged

- **`--tone` itself, and every shared token.** The brief's own rule. Not one
  of the five fixes moves a token the other cells read: L9-1 moves layout
  that carries no colour, L9-2/3/4 change *how* a derived colour is solved
  rather than what it is derived from, and L9-5 splits two authored values in
  two rather than picking a new compromise. `--tone`, `--bg`, `--fg` and
  `--accent` are unchanged from before Part 9.
- **`--accent` being global across all four sceneries.** Confirmed again here
  (CODEBASE_MAP.md §7 measured it on 2026-09-20): no `[data-scenery]` block
  sets an accent or type token. That is a scenery-identity question for a
  design pass, not a contrast defect — it clears 4.5:1 in both themes.
- **Garden and observatory still wobble section-to-section in `surface`**
  (2.19–4.06 dark). Both set `surfaceLightness`, which is documented as an
  HSL-lightness override and is applied after L9-3's luminance solve. Making
  that field a luminance target too would change what the field means for a
  gain of nothing — every cell already clears the bar.
- **`wash` has no threshold.** It is the accent seen *through* the page and is
  supposed to be barely there; 1.2–2.2 across the matrix is the intent, not a
  near-miss. It is printed for provenance and never checked.

---

## Part 10 — Reduced motion  `[ ]`

Verify against the actual bypass path in `scenery-transition.ts` /
`scene-scenery-store.ts` (`setSceneryInstant`, all four commits fire
synchronously, `veilTargets` opacity cleared via `gsap.set(...,
{clearProps})`) and against each scenery's still form:

- No light orbit (`observatory`'s key holds a fixed position)
- No vine growth animation (`garden` renders its settled/grown pose)
- No continuous sway, no cursor aura, no click ripple
- Scenery switch collapses to effectively one frame, not a fast-forwarded 900ms
- The page must still look *considered* at rest, not like animation was
  simply deleted

If any scenery's reduced-motion pose looks unfinished (e.g. a vine frozen
mid-growth instead of fully grown, or a trace mid-draw instead of complete),
that's a P1 — the still pose is itself part of the design, not a fallback.

---

## Part 11 — Responsive art direction  `[ ]`

At `1440×900`, `1024×820`, `390×844`, for each scenery: is the composition
still intentional, or is it the desktop scene scaled down? Are 3D objects
colliding with headings/CTAs on mobile? Is camera framing (`camera-rig.tsx`
waypoints) still appropriate at narrow viewports? Where mobile needs
different object density, that's a `scenery.ts` / `device-tier.ts` budget
scalar adjustment (S11: scale down, never a new boolean feature flag) — not
a parallel mobile-only scene.

---

## Part 12 — Performance during the review  `[ ]`

Re-run [SCENERY_SYSTEM_PLAN.md §10](SCENERY_SYSTEM_PLAN.md#10-motion--scroll-performance-contract)'s
contract while judging, not after:

- Full-page scroll trace: ≤16ms long frames at `high` tier, ≤24ms at `low` (§10.6)
- Cursor aura contributes zero frames during scroll (§7 in the parent plan,
  gated by [use-scroll-velocity.ts](src/lib/experience/use-scroll-velocity.ts))
- Raycaster hover is suspended above the scroll-velocity threshold (§6.2)
- Scenery switch stays within its measured budget (Part 7 above)
- No new `useFrame` loop was added when an existing shared integrator
  (`scene-timer.ts`, `scene-motion.ts`) already covers it

A visual fix that regresses any of these gets redesigned, not shipped with
the regression accepted.

---

## Part 13 — Before adding any animation, answer all five  `[ ]`

```
What does this animation communicate — hierarchy, material, depth,
  interaction, environmental life, transition, spatial continuity,
  or state change?
Why does *this* scenery specifically need it (not "3D scenes generally")?
Why is this the correct motion language for this scenery's temperament?
What happens to it under reduced motion (Part 10)?
What is its per-frame cost, and which existing integrator absorbs it?
```

If any answer is unclear, don't add the animation. The goal is maximum
*perceived intentionality*, not maximum motion — a scenery with less motion
than its siblings (blueprint) is not under-built, it's correctly restrained.

---

## Part 14 — Defect classification

- **P0 — Broken.** Functionality, accessibility, rendering, or interaction failure.
- **P1 — Experience defect.** The scenery's intended concept isn't communicated (e.g. `garden` doesn't feel alive, `blueprint` feels playful).
- **P2 — Art-direction defect.** Animation, lighting, composition, material, or timing feels unfinished.
- **P3 — Polish.** Small timing/spacing/easing/responsive refinement.

Fix P0 → P1 → P2 → P3. Do not polish a component whose concept is wrong —
fix the concept first.

---

## Part 15 — Validation protocol  `[ ]`

Same protocol as
[SCENERY_SYSTEM_PLAN.md §14](SCENERY_SYSTEM_PLAN.md#14-verification-protocol),
run one more time end to end for Phase L specifically:

1. `npm run dev`; drive a real browser (Playwright), not just source reading.
2. Screenshot each of the four sceneries at `1440×900`, `1024×820`, `390×844`,
   light and dark, at rest and mid-switch.
3. Full-page scroll trace with the pointer in motion — long-frame count and
   longest frame, for both the default tier and forced `low`.
4. Re-run the [§11 control matrix](SCENERY_SYSTEM_PLAN.md#11-control-matrix):
   `three-scene` off, `three-scenery` off, `prefers-reduced-motion: reduce`,
   forced `low`, coarse pointer, WebGL off.
5. Drive all twelve ordered scenery-switch pairs; record wall-clock duration
   and max frame gap per switch (Part 7 — this is the measurement Phase K
   deferred).
6. `npm run typecheck && npm run lint` last. Report against the **current**
   baseline (check the count freshly — Phase K's notes record it drifting
   from Act II's original 15 typecheck / 8 lint baseline up to 277 lint
   problems across phases; do not cite either stale number, and do not
   silently fix files this phase didn't touch).
7. Compare every screenshot and trace against Phase K's last recorded state.

Compiling clean is not evidence. A screenshot, a trace, and a control-matrix
pass are.

---

## Part 16 — Final director checklist  `[ ]`

Do not flip [SCENERY_SYSTEM_PLAN.md](SCENERY_SYSTEM_PLAN.md)'s `Phase L`
box until every line here is true:

**World**
- [ ] Each scenery feels like a different world, not a recolour of another.
- [ ] Each has a distinct motion temperament (§3 above) and material/light relationship.

**3D**
- [ ] Geometry feels intentional; no effect exists solely because it's technically possible.
- [ ] Lighting communicates material in every scenery (§3).
- [ ] Camera movement stays controlled; Inspect mode is the only free camera, `blueprint` only.

**Motion**
- [ ] Motion is authored per scenery, not generic; easing matches temperament.
- [ ] Objects settle via `damp`/`springStep`, never snap.
- [ ] Nothing fights scrolling (Part 12's frame budgets hold).

**DOM**
- [ ] Typography stays dominant in all four.
- [ ] Skills and Projects are genuinely different concepts per scenery, in DOM and WebGL both.
- [ ] Accessibility (focus order, single tab stop on cards, `aria-live` on the picker) is intact.

**Theme**
- [ ] All 8 scenery × theme combinations reviewed and coherent (Part 9).

**Responsive**
- [ ] `1440×900`, `1024×820`, `390×844` all reviewed per scenery (Part 11).

**Reduced motion**
- [ ] Every scenery has a deliberately still, finished-looking form (Part 10).

**Performance**
- [ ] Scroll, switch, and interaction traces meet §10/§12's budgets, measured in a real browser.

**Final judgment:** does this feel like a professionally art-directed
interactive 3D portfolio, or a portfolio with 3D effects added to it? If the
latter, keep refining before flipping the box.

---

## Final deliverable

1. Fix every P0/P1. Fix material P2s. Apply worthwhile P3 polish.
2. Do not expand scope beyond what Parts 2–13 found.
3. Record, in this file or the PR: what changed and why, what was
   intentionally left unchanged and why, the performance numbers from Part
   15, and the typecheck/lint counts against the current baseline.
4. Capture the final screenshot matrix (Part 15.2).
5. Only then flip `[ ] Phase L — Creative-direction review` to `[x]` in
   [SCENERY_SYSTEM_PLAN.md](SCENERY_SYSTEM_PLAN.md) §13, and only then is
   Act III complete.

The finished result should communicate: **Atelier — crafted. Observatory —
discovered. Garden — alive. Blueprint — engineered.** Lighting, materials,
camera, DOM and WebGL all reinforce those four identities; none of them
merely decorates the page.
