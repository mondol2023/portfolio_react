# Codebase Map

A lookup table for this repo: **symptom or task → the exact file to open.**
Written so you never have to grep the whole tree again. `L` = line count at
time of writing (a rough "how big is this" signal, not a guarantee).

Path alias: `@/*` → `./src/*`.

> **Maintenance:** when you add a file or move responsibility between files,
> update the row here. A row that lies is worse than no row.

---

## 0. The thirty-second orientation

| Layer | Directory | Rule |
|---|---|---|
| Routes | `src/app/` | `(site)` = public, `admin/(dashboard)` = CMS. No shared layout. |
| UI | `src/components/` | `sections/` public page · `admin/` CMS · `motion/` primitives · `ui/` off-limits (S18) |
| Site-wide 3D | `src/three/` | **One** `<Canvas>`, mounted once in `(site)/layout.tsx`, `z-index: -8`. |
| Game Mode 3D | `src/game/` | Separate, removable world. **Never imports `@/lib` or `@/components`.** |
| Logic/state | `src/lib/` | `experience/` = scene runtime · `store/` = zustand · `firebase/` = the only Firestore access |

**Two independent 3D systems. Do not conflate `src/three` with `src/game`.**

Binding design docs, in dependency order:
`THREE_D_EXPERIENCE_PLAN.md` (Act I) → `IMMERSIVE_3D_WORLD_PLAN.md` (Act II) →
`SCENERY_SYSTEM_PLAN.md` (Act III, phases A–L) → `PHASE_L_CREATIVE_DIRECTION_PLAN.md` (Phase L brief).
`GAME_LAYER_PLAN.md` + `GAMIFICATION_PLAN.md` own `src/game` only.

---

## 1. The scenery system (Act III) — most Phase L work lands here

Four "worlds": `atelier` (crafted) · `observatory` (discovered) · `garden` (alive) · `blueprint` (engineered).

### Where a scenery's identity is defined

| I want to change… | File | Notes |
|---|---|---|
| **Any per-scenery constant** (tone map, exposure, timescale, particle scale, light rig, `entrance` language, which variant) | `src/lib/experience/scenery.ts` (256L) | **The single source of truth.** Data, never a `switch`. No `three` import — it is reachable from the non-code-split `scene-root.tsx`. |
| Colour skin per scenery (hue/chroma/lightness post-process) | `src/lib/experience/scene-palette.ts` (231L) | `buildScenePalette(tone, bg)` derives; `applyScenerySkin(palette, skin)` post-processes. `ScenerySkin` is declared here, *used* from `scenery.ts`. **`lineColor` and `surfaceLightness` take a `ThemedSkinValue<T>` — a bare value or `{light, dark}` — because an authored colour is a claim about the page it lands on. Hue rotation and `surface` hold *relative luminance*, not HSL lightness (Part 9).** |
| The light rig actually mounting | `src/three/scene/lighting.tsx` (138L) | `SceneLighting({palette, budget, scenery})`. Reads intensities from `scenery.lights`, colours from the palette. Key-orbit quaternion pattern lives here. |
| `ToneMappingId` → `THREE.*ToneMapping` | `src/three/scene/tone-mapping.ts` (19L) | Exists only to keep `three` out of `scenery.ts`. |
| The visible CSS backdrop | `src/components/layout/ambient-background.tsx` (54L) + `[data-scenery]` blocks in `src/app/globals.css` | Selector order is fixed: `[data-scenery="x"]`, then `.dark [data-scenery="x"]`. **The chassis (fixed/inset/z-index, blob size, `animation-name`) is unnamespaced `.ambient*`; a `[data-scenery]` block supplies look only.** Shafts and stars are `display: none` by default and opted into per scenery. All four have a block since Phase L Part 9 — observatory had none at all before it. |
| Which scenery is active / persistence / `<html data-scenery>` | `src/lib/store/scene-scenery-store.ts` (97L) | `id` = committed choice. `renderScenery` = what WebGL/CSS see, lags `id` by up to 900ms during the crossfade. **Never set `renderScenery` directly.** localStorage key `portfolio:scenery`. |
| The switch animation | `src/lib/experience/scenery-transition.ts` | 900ms GSAP timeline. Commits at `DURATION × {0.20, 0.28, 0.36, 0.44}` for exposure → palette → lights → geometry, under a `veilTargets` opacity dip that lifts from `0.60`. **The only GSAP in the codebase.** Geometry commits from an `addPause`, not a `.call()` — it resumes on the next rAF so the swap can never render in the same tick as the reveal (Phase L L7-3). `pendingId` guards a second pick arriving mid-flight; `cancelSceneryCrossfade()` is the abort used by `setSceneryInstant`. |
| The picker UI | `src/components/layout/scenery-picker.tsx` (142L) | `radiogroup`; trigger has `aria-label="Scenery: <Name>"`, rows are `role="radio"`. Has an `aria-live="polite"` announcer. Also surfaced in `mobile-menu.tsx`. |
| Keeping `data-scenery` synced | `src/components/layout/scenery-controller.tsx` (35L) | Renders nothing. Takes the `three-scenery` admin flag. |

### Per-scenery variant files

Both families dispatch through a tiny index that maps `scenery.<x>Variant` → component.

| Scenery | Hero (3D) | Skills (3D) | Projects (3D) | Skills (DOM) | Projects (DOM) |
|---|---|---|---|---|---|
| atelier | `hero/platonic.tsx` | `skills/constellation.tsx` (298L) | `projects/corridor.tsx` (**773L**, the biggest file in the repo) | default | default |
| observatory | `hero/orrery.tsx` | `skills/orrery.tsx` (293L) | `projects/monoliths.tsx` (302L) | default | default |
| garden | `hero/organic.tsx` | `skills/growth.tsx` (338L) | `projects/foliage.tsx` (286L) | `components/skills/variants/growth.tsx` | default |
| blueprint | `hero/drafting.tsx` | `skills/schematic.tsx` (266L) | `projects/plansheets.tsx` (269L) | `components/skills/variants/schematic.tsx` | `components/projects/variants/plansheet-card.tsx` |

- Dispatchers: `src/three/objects/hero/index.tsx` (39L, switches on `scenery.geometry`),
  `src/three/objects/skills/index.tsx` (44L), `src/three/objects/projects/index.tsx` (56L),
  `src/components/skills/skills-variant-switch.tsx`, `src/components/projects/project-card-switch.tsx`.
- **Hero's shared layer:** `src/three/objects/hero/composition.ts` owns placement, scale, presence
  and the `HeroTemperament` numbers for all four forms, and exports the mutable `heroShellSpin`
  (`{angle, x}`) that `about-fragments.tsx` and `lighting.tsx`'s spot both read. **A hero form
  file never branches on a scenery** — it supplies geometry and a temperament, nothing else.
- **Shared layout, not duplicated per variant:** `src/three/objects/skills/layout.ts` (98L — `buildNodes`,
  `NODE_RADIUS`, `CLUSTER_RADIUS`) and `src/three/objects/projects/layout.ts` (110L — `WallSlab`, `SLAB_*`, `WALL_*`).
  **Change geometry here to affect all four variants at once.** `buildNodes` takes
  `scenery.hueSpread` — how far category coding may rotate a node off the scenery accent
  (`0` = monochrome, blueprint). Category stays readable via a lightness ladder.
- **Shared hover rule:** `src/three/objects/projects/hovered.ts` (30L — `hoveredSlabIndex`). All four
  Projects variants resolve “which slab is attended to” through it: **a hovered DOM card wins outright**,
  and the screen-space ray is consulted only when none is published. A hovered card with no slab (the page
  lists more projects than `WALL_LIMIT` draws) correctly yields `-1` — nothing lit. Don’t reintroduce a
  per-variant pick.

---

## 2. The persistent site-wide 3D scene (`src/three/`)

### Mount chain

```
src/app/(site)/layout.tsx
  └ <SceneRoot enabledAnimations>        src/three/scene/scene-root.tsx (121L)
      · reads the `three-scene` flag → returns null if off
      · SceneErrorBoundary → renders null on WebGL failure
      · registers itself as a crossfade veil target
      └ next/dynamic → <SceneCanvas>     src/three/scene/scene-canvas.tsx (233L)
          · the ONE <Canvas>; applies tone mapping + exposure (S5)
          └ per-section scene groups, all siblings in the same canvas
```

### Scene infrastructure

| File | L | Owns |
|---|---|---|
| `scene/scene-root.tsx` | 121 | Flag gate, error boundary, veil registration, `--tone`/`--bg` read |
| `scene/scene-canvas.tsx` | 233 | The single `<Canvas>`, tone mapping, exposure, dpr |
| `scene/camera-rig.tsx` | 235 | **Six scroll waypoints.** `SCENE_SECTION_COUNT`, `sceneSectionProgress()`, `sceneSectionEnvelope()`. Quaternion/lerp only — never Euler accumulation. |
| `scene/scroll-physics.tsx` | 93 | "The one place scroll turns into motion." Damped scroll → scene. |
| `scene/lighting.tsx` | 138 | Per-scenery rig (see §1) |
| `scene/environment.tsx` | 142 | IBL / environment map |
| `scene/atmosphere.tsx` | 203 | **The codebase's only custom shader** (Act II D6), spent on the background |
| `scene/drifters.tsx` | 350 | Floating background objects; interactive/grabbable. Reads `scenery.materials` — the **only** consumer of that field; `unlit` makes them wireframes (blueprint). |
| `scene/signature-moment.tsx` | 124 | The Projects→Experience set piece |
| `scene/geometry.ts` | 179 | `roundedSlabGeometry`, `fibonacciSpherePoints`, `arcSlotPosition`, `glowTexture`, `gridTexture` |
| `scene/fps-monitor.tsx` | 56 | Runtime tier step-down when the static guess was wrong |
| `scene/inspect-controls.tsx` | 14 | drei `OrbitControls`. **Blueprint's Inspect mode only — the only free camera in the site.** |
| `scene/procedural-fallback.tsx` | 65 | `AssetBoundary` — every loaded asset has a procedural fallback (S10) |
| `scene/loaders.ts` | 33 | GLTF/Draco/Meshopt pointed at local `public/decoders/`, not a CDN |

### Section scenes → their objects

| Section | Scene group | Objects it composes |
|---|---|---|
| Hero | `sections/hero-scene.tsx` | `objects/hero/*` (variant — see §1) |
| About | `sections/about-scene.tsx` | `objects/about-fragments.tsx` (165L) |
| Skills | `sections/skills-scene.tsx` | `objects/skills/*` (variant) |
| Projects | `sections/projects-scene.tsx` | `objects/projects/*` (variant) |
| Experience | `sections/experience-scene.tsx` | `objects/experience-timeline.tsx` (555L) |
| Contact | `sections/contact-scene.tsx` | `objects/contact-calm.tsx` (99L) — no data bridge, nothing to visualise |

### DOM → 3D data hand-off

`src/three/bridge/scene-data-bridge.tsx` (32L) — `SkillsSceneBridge`, `ExperienceSceneBridge`,
`ProjectsSceneBridge`. Each **renders nothing**; it pushes its server-rendered
section's props into `scene-content-store`. Add a new data-driven section here.

---

## 3. Scene runtime (`src/lib/experience/`) — the shared vocabulary

**Before writing any new motion, look here first. Adding a second integrator,
clock, or easing set is a design error.**

| File | Exports you will actually want |
|---|---|
| `scene-motion.ts` | `damp`, `dampFactor` (settle/inertia) · `springStep` (drag/hover release) · `stagger` (entrances) · `easeOutCubic`/`easeOutExpo`/`easeInOutSine` · `clampDelta`, `MAX_FRAME_DELTA` (1/30) · `SCENE_SMOOTHING` · `EntranceId` + `entranceStagger`/`entranceEase` — the per-scenery arrival language, *declared* here, *used* from `scenery.ts` |
| `springs.ts` | `SPRING` named values · `spring(name)` · `springOrCut(name, reducedMotion)` · `GLITCH`. **Add a named entry only if reused 3+ places; never a bare number in a component.** |
| `scene-timer.ts` | `sceneTime` (`{elapsed, delta}`) · `tickSceneTimer()` · `setSceneTimescale()`. **The one clock.** Per-scenery timescale is pushed here from `scenery.ts`. |
| `use-scene-progress.ts` (285L) | `useSceneTone()` · `getSceneProgress()` · `getLocalSectionProgress(id)` · `subscribeSceneProgress()`. Scroll is the only story parameter. |
| `scene-scroll.ts` | `sceneScroll.progress` / `.velocity` — the raw mutable values read inside the frame loop · `SCROLL_RAY_SUSPEND` (the hover ray's scroll gate) |
| `use-scroll-velocity.ts` | `useScrollVelocity()` · `SCROLL_SUSPEND_VELOCITY = 0.5`. **Gates the cursor aura and raycaster off during fast scroll.** |
| `scene-raycaster.ts` | `registerInteractive(obj, meta)` (returns an unregister fn) · `interactiveMeta` · `pickNearest` · `createHoverPicker()` (throttled + scroll-gated, one per caller) · `dragPlaneThroughPoint` · `dragPointOnPlane` |
| `scene-pointer.ts` | `scenePointer` · `wasClick()` · `setSceneDragging()` · `setSceneGrabbable()` |
| `device-tier.ts` | `Tier` = low/mid/high · `SceneBudget` · `budgetFor` · `detectTier` · `classify` · `stepDownTier` · `stillBudget`. **All quantities, no booleans — S11: scale down, never add a feature flag.** |
| `scene-palette.ts` | `buildScenePalette`, `applyScenerySkin`, `ScenePalette`, `ScenerySkin` |
| `scene-signature.ts` | `SignatureMode` · `signature` · `signatureAt` · `signatureRamp` · `SIGNATURE_SECTION_INDEX = 3` |
| `scene-drifters.ts` | `DrifterSpec`, `buildDrifters`, `DRIFTER_COUNT` per tier |
| `scene-layout.ts` | `CONTENT_MAX_PX = 1216`, `CONTENT_PAD_PX = 40`, `contentSafeFraction(w)`, `gutterPixels(w)` — **use these to keep 3D out of the type column** |
| `scenery-transition.ts` | `runSceneryCrossfade`, `registerVeilTarget`, `SceneryCrossfadeCommits` |
| `use-css-colors.ts` | `useCssColors(names, scope)` — bridges CSS custom properties into WebGL. Cannot carry alpha. |
| `random.ts` | `seededRandom(seed)`, `sphericalCloud` — deterministic layout |
| `use-scene-active.ts` / `use-scene-budget.ts` / `use-pointer.ts` / `use-pointer-press.ts` | mount gating, budget, pointer |

### Stores (`src/lib/store/`)

| Store | Holds |
|---|---|
| `scene-scenery-store.ts` | Active scenery (see §1) |
| `scene-interaction-store.ts` | `publishHoveredSkill` / `clearHoveredSkill`, and since Phase L Part 6 `publishHoveredProject` / `clearHoveredProject`. Both pairs are fine-pointer-gated and clear last-writer-wins. `hoveredProjectId` was a **dead field** from Phase J until Part 6 gave it writers (the two card components) and one reader (`objects/projects/hovered.ts`). |
| `scene-content-store.ts` | CMS data pushed in by the bridges |
| `scene-inspect-store.ts` | Inspect mode active flag (blueprint only) |
| `game-store.ts` | Game Mode bridge |

---

## 4. Public site DOM

| Section | Component | 3D counterpart |
|---|---|---|
| Hero | `components/sections/hero.tsx` (161L) | `hero-scene.tsx` |
| About | `components/sections/about.tsx` (96L) | `about-scene.tsx` |
| Skills | `components/sections/skills.tsx` (63L) | `skills-scene.tsx` |
| Projects | `components/sections/projects.tsx` (85L) | `projects-scene.tsx` |
| Experience | `components/sections/experience.tsx` (226L) | `experience-scene.tsx` |
| Contact | `components/sections/contact.tsx` (76L) | `contact-scene.tsx` |

Shared wrapper: `components/sections/section.tsx` (63L) — sets `data-tone`, the
section id, and the scroll anchor. Section ids, in order:
`home, about, skills, projects, experience, contact`.

**Layout chrome:** `layout/site-header.tsx` (120L) · `site-footer.tsx` · `mobile-menu.tsx` (211L) ·
`ambient-background.tsx` · `cursor-aura.tsx` (162L, DOM/CSS only, **not** WebGL) ·
`inspect-mode-effects.tsx` (50L) · `skip-link.tsx` · `page-header.tsx`

**Motion primitives (`components/motion/`)** — all gated on `useMotionPreference()`:
`reveal.tsx` (the standard DOM entrance) · `animated-text.tsx` (splits into per-word spans) ·
`stagger.tsx` · `fade-in.tsx` · `curtain.tsx` · `depth-scale.tsx` · `scroll-veil.tsx` ·
`scroll-progress-line.tsx` · `variants.ts` · `motion-provider.tsx`

`variants.ts` owns the DOM half of the per-scenery arrival: `createFadeVariants`
takes an `EntranceId` and resolves pace (duration/ease/distance) from it.
`reveal.tsx` and `stagger.tsx` read it from `useSceneSceneryStore.renderScenery`
(*not* `id`) so the pace commits on the crossfade, not ahead of it.

**`components/ui/` is off-limits (S18).** Do not edit it for a scenery or motion fix.

---

## 5. Data, auth, admin

```
Server Component / Server Action
  └ src/lib/firebase/repositories/*        the ONLY Firestore access
      · reads NEVER throw (degrade to empty list) · writes ALWAYS throw
      · every read wrapped in React cache()
      └ src/lib/firebase/admin.ts          server-only Admin SDK
        src/lib/firebase/converters.ts     the ONLY Timestamp ↔ ISO conversion
```

- Collections (`lib/firebase/collections.ts`): `projects/{id}`, `experience/{id}`,
  `skills/{id}`, `content/about`, `content/siteSettings`, `messages/{id}`, `admins/{uid}`.
- Dates are ISO `YYYY-MM-DD` strings **everywhere above the repository layer**.
- Skills use qualitative proficiency levels, **not** percentages.
- **Authorization is enforced at three independent layers:** the admin layout
  redirect, `withAdmin()` in every action (`lib/actions/admin-guard.ts`), and
  `firestore.rules`. Removing one still leaves the others.
- `lib/validation/*` — Zod schemas, UI-independent, shared by forms and actions.
- **Demo content:** `lib/constants/demo-content.ts` (315L) backs every section
  independently with a "Sample data" badge until Firestore has content.
  `PORTFOLIO_DEMO_CONTENT=off` shows real empty states.

**Animation flags** (`/admin/settings` → `content/siteSettings.enabledAnimations`):
ids listed in `lib/types/content.ts` (198L). Read server-side in `(site)/layout.tsx`,
passed down as plain props. Key ids: `three-scene` (whole canvas),
`three-scenery` (picker + non-atelier sceneries), `three-camera-scroll`.
Admin UI: `components/admin/animation-toggles.tsx`.

---

## 6. Game Mode (`src/game/`) — 66 files, hard-walled

`src/game/README.md` is authoritative. The invariants:

- **No imports from `@/lib` or `@/components`.** Theme coupling is CSS custom
  properties only, via `game/config/palette.ts`.
- Gameplay logic lives in `systems/` behind a `GameSystem` interface, ticked by `SystemRunner`.
- One focused zustand store per concern. No god store.
- **Physics transforms never enter React state** — meshes read Rapier bodies directly.
- Systems communicate only through `events/game-bus.ts`, never by importing each other.
- `src/game/index.ts` is the sole public export surface: `GameProvider`, `GameScene`,
  `GameOverlay`, `GameHUD`, `CameraController`, `GameEffects`.
- `three` and Rapier load only via `next/dynamic` after activation — **zero world bytes in Normal Mode.**
- Bridged into the site by `components/game/world-layer.tsx`.

---

## 7. Symptom → file

| Symptom | Start here |
|---|---|
| 3D object overlaps/crowds the headline | `scene-layout.ts` (`contentSafeFraction`) · the variant's `layout.ts` · `camera-rig.tsx` waypoints. **Not** a new component. |
| A scenery looks like a recolour of another | `scenery.ts` (geometry vocabulary / variant choice), then the variant file. A palette change alone will not fix it. **`geometry` and `materials` were each declared here and read by nothing until Phase L Part 3 — if you add a field, wire its consumer in the same change.** |
| Text contrast wrong in one scenery×theme combo | The specific `[data-scenery][.dark]` block in `globals.css`. **Never a shared token** — 8 combinations read it. Measure first: `scripts/phase-l/theme-matrix.mjs` reports every settled text node against its *composited* background, per cell. **Two known, unfixed defects will show up in every run** (Part 9, L9-6/L9-7), so check against them before hunting a third: `--fg-subtle` misses 4.5:1 in both themes (3.70/4.07 on `--bg`, 3.85/3.84 on `--surface`) and accounts for every non-`skills` failure in all 8 cells; `TechTile` monograms use raw brand hex and fail 68 nodes light vs 8 dark. Neither is fixable from a scenery block — the first is a shared token, the second is `src/components/ui` (S18). |
| 3D geometry invisible, washed out, or flat in one theme | `scripts/phase-l/palette-matrix.mjs` — offline, instant, all 8 cells. It imports `scene-palette.ts` directly under Node type stripping, so it needs no browser and no GPU. The fix is almost always *how* a colour is solved in `scene-palette.ts`, not a new token. |
| A scenery's backdrop does nothing | Check whether its `[data-scenery]` block is setting a property the unnamespaced chassis has to supply first (`animation-duration` without `animation-name` was garden's bug for two phases). |
| Accent colour is wrong for a scenery in the DOM | `globals.css` `[data-scenery]` accent token. (`applyScenerySkin` only reaches WebGL.) **Verified 2026-09-20: no `[data-scenery]` block sets any accent/type token — they only skin `.ambient*`, and `observatory` has no block at all. `--accent` is global: `#c2410c` light / `#fb923c` dark in all four worlds.** |
| Motion feels mechanical / snaps | `scene-motion.ts` (`damp`, `springStep`) — the primitive almost certainly exists already |
| Every world enters the same way (fade + move up) | `scenery.ts` `entrance` → `entranceStagger`/`entranceEase`. A section computing its own `smoothstep(entryProgress, 0, 1)` is the bug. DOM half: `createFadeVariants` in `components/motion/variants.ts`. |
| A scenery's pace is wrong | `scenery.ts` `timescale` → `scene-timer.ts`. **Do not add a second clock.** |
| Scenery switch feels like a hard cut | Retime the four commit offsets or `veilTargets` easing in `scenery-transition.ts`. Do not add interpolation tracks (§17). **Measure before judging:** `scripts/phase-l/switch-pairs.mjs` reports `veilAtCommit`, the veil opacity at the instant `data-scenery` flips — above the `0.08` floor means the world swapped in view, which is what a "hard cut" usually is. |
| A scenery switch lands on the wrong world, or the picker and the screen disagree | `scenery-transition.ts` — the `pendingId` guard. `renderScenery.id` lags the choice by 44% of the timeline, so a guard that reads it cannot answer "where are we going". `scripts/phase-l/switch-interrupt.mjs` reproduces it. |
| Hover/click does nothing in the canvas | `scene-raycaster.ts` `registerInteractive` · `scene-interaction-store.ts` (check for the dead-field trap) · for press-driven variants, check `usePointerPress` is actually registered in `scene-canvas.tsx` — it was once gated on the drifters flag |
| No `cursor: grab` over a grabbable object | `setSceneGrabbable()` in `scene-pointer.ts` → `.scene-grabbable` in `globals.css`. The WebGL layer never sets a cursor (§6.2). `scripts/phase-l/interaction-states.mjs` measures it. |
| Something jitters during fast scroll | `use-scroll-velocity.ts` (`SCROLL_SUSPEND_VELOCITY`) · `scroll-physics.tsx` |
| Reduced-motion pose looks unfinished | The variant's own still branch + `setSceneryInstant` in `scene-scenery-store.ts`. The still pose is design, not a fallback. |
| Too heavy on mobile | `device-tier.ts` budget + `scenery.ts` `particleScale`. **Scale down; never add a boolean flag (S11).** |
| Canvas blank / WebGL failure | `SceneErrorBoundary` in `scene-root.tsx` (renders `null` by design) |
| Rotation drifts or gimbals | Use quaternion `setFromAxisAngle`/`slerp` — pattern in `lighting.tsx` key orbit and `orrery.tsx`. Never raw Euler accumulation (§9). |

---

## 8. Commands & gotchas

```bash
npm run dev         # localhost:3000 (falls back to 3001 if taken)
npm run build       # runs typecheck — currently FAILS on the pre-existing baseline
npm run lint        # eslint . — Next 16 removed `next lint`
npm run typecheck   # next typegen && tsc --noEmit
```

**No test suite exists** (no `test` script, no Vitest/Jest). Verification is
Playwright against the rendered page, per `SCENERY_SYSTEM_PLAN.md` §14.

**Current baseline — do not cite stale numbers, and do not silently fix files
your phase did not touch:**

- **typecheck: 15 errors**, all in `components/admin/analytics/*` (11),
  `admin/settings-form.tsx` (2), `admin/ripple-toggle.tsx` (1). Several are
  missing modules (`@/lib/analytics/*`, `@/lib/firebase/repositories/analytics-repository`,
  `@/lib/actions/ripple-actions`) — an unfinished analytics feature. **This makes
  `npm run build` fail**, so production-build verification is blocked until it is fixed.
- **lint: 277 problems (28 errors, 249 warnings).**

Other gotchas:

- `seed.js` is CommonJS run outside the bundler — its `require()` calls are correct; there is an eslint override for it.
- Tailwind v4 is CSS-first: **there is no `tailwind.config.ts`.** Tokens live in `globals.css`.
- TS `strict` + `noUncheckedIndexedAccess` are on.
- `AGENTS.md` is regenerated by `next dev` — committing it with your work keeps the tree clean.
- Comments in `src/three/` run long by established convention. **Match that style only
  when editing existing files there; keep new comments terse everywhere else.**
- **No new dependencies** (§17). GSAP, `motion/react`, drei and the `SPRING`
  vocabulary are already installed and already used.

### Driving the rendered page locally

localStorage keys that control the matrix without touching source:
`portfolio:scenery` (`atelier`|`observatory`|`garden`|`blueprint`) and `theme` (`light`|`dark`).
Force a low tier by overriding `navigator.deviceMemory` / `hardwareConcurrency` in an init script.

⚠️ **This sandbox has no GPU.** Playwright falls back to SwiftShader, where a
frame costs ~250ms and the canvas takes ~20s to first paint. Screenshots are
valid; **all frame timings and switch durations measured here are not** — they
say nothing about §10/§12's 16ms/24ms budgets.

#### Five traps that make a screenshot lie (each has cost a Phase L pass)

1. **Scroll to `block: "center"`, never `"start"`.** Every `<Section>` is
   wrapped in `ScrollVeil`, whose opacity *is* a function of scroll position.
   A section parked at the viewport top is deliberately still faded in, so its
   type measures as low-contrast for a reason that has nothing to do with 3D.
2. **Wait ~20s at the scroll position, not ~3s.** `<ScrollPhysics>` damps
   scroll into `sceneScroll.progress`; at ~250ms/frame the spring needs an
   order of magnitude more wall-clock to converge here than it would on a GPU.
   Screenshot early and the scene is still mid-transition — Projects' corridor
   is still standing (the signature moment's covering wall fills the frame) on
   top of Experience, which reads as a catastrophic full-section wash and is
   purely an artifact. Measured atelier/light/1440: body copy 2.52:1 at a 3.2s
   settle vs **6.86:1 (its true baseline) at 20s**, same build, same position.

3. **Assert the dev overlay is not mid-compile.** After any edit Next
   hot-recompiles, and a capture taken during it can show a *different
   scenery's* objects centre-screen over the headline — a catastrophic-looking
   failure that is pure artifact. Measured in Phase L Part 3: garden rendered
   atelier's sphere-and-torus over the H1 while "Compiling …" was visible in
   the shot, and was correct on re-capture. Gate every screenshot on
   `!document.body.innerText.includes("Compiling")`.

4. **A gap in the page may be a paint artifact, not missing content.**
   SwiftShader can return a screenshot with whole rows unpainted that are
   present and fully opaque in the DOM. Measured in Phase L Part 4:
   `garden/light` came back missing the Skills list's `FRONTEND` and `BACKEND`
   groups; the same cell was correct in dark and in reduced motion, a re-run
   under identical conditions was correct, and a DOM probe read all five
   headings at `opacity: 1`, `transform: none` at both 9s and 30s. Before
   filing "content is missing", probe the computed `opacity`/`transform` of
   the elements in question — the DOM is the evidence, the PNG is not.

5. **Never edit source while a capture matrix is running.** Next hot-recompiles
   on save, so cells captured after the edit record the *new* build while the
   run is still labelled as the old one — and unlike trap 3 this leaves no
   trace, because by capture time the overlay is gone and `compiling` reads
   false. Measured in Phase L Part 5: four of the six baseline cells recorded
   the patched camera as the "before", and the regression only surfaced
   because two cells disagreed with the offline projection. A before/after
   matrix is a build comparison; finish the run, then edit.

Corollary: a *steady-state* judgment needs the long settle; anything measured
before it says nothing. All five traps produce plausible-looking defects, so
confirm any finding survives a long settle — and, for anything that looks
absent, a DOM probe — before routing it to a file.
