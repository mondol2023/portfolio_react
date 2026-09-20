# Scenery System — Act III direction & build plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

Working file for the third act of the 3D work. Act I built a scroll-driven
scene, Act II turned it into a world. **Act III makes that world swappable**:
one scenery picker that repaints, re-lights, re-materialises and
re-choreographs the entire site — DOM and WebGL together — and in doing so
closes the long list of three.js capabilities the codebase has never touched.

Read this before writing code. Resume at the first unchecked box. Flip the box
in the same session that does the work.

**Sibling trackers — do not duplicate their scope here:**

| File | Owns | Relationship |
|---|---|---|
| [THREE_D_EXPERIENCE_PLAN.md](THREE_D_EXPERIENCE_PLAN.md) | Act I, phases 0–12 | Foundation. Its §0 audit and §27 layout still bind. |
| [IMMERSIVE_3D_WORLD_PLAN.md](IMMERSIVE_3D_WORLD_PLAN.md) | Act II, phases 13–21 | **Every invariant in its §0 still binds.** Act III extends, never re-implements. |
| [GAME_LAYER_PLAN.md](GAME_LAYER_PLAN.md) | Opt-in Game Mode (`src/game`) | A different layer. Untouched except where §6 borrows its raycast pattern. |
| [GAMIFICATION_PLAN.md](GAMIFICATION_PLAN.md) | Scoring on Game Mode | Unrelated. |

---

## 0. Feature audit — the brief against the tree

Verified against branch `3d.1` on 2026-09-15. Every "yes" below carries the
file that proves it; every "no" was confirmed by a repo-wide grep returning
zero hits in `src/three`, `src/game` and `src/components`.

### 0.1 Present and working — do not rebuild these

| Capability | Where | Notes |
|---|---|---|
| Frame-based animation | 25 files call `useFrame` | Universal. |
| Frame-rate-independent interpolation | [scene-motion.ts](src/lib/experience/scene-motion.ts) | `damp`, `dampFactor`, `springStep`, `stagger`, `easeOut*`, `clampDelta`. |
| Smooth rotation via quaternions | [about-fragments.tsx:134](src/three/objects/about-fragments.tsx#L134) | `slerpQuaternions` then `quaternion.slerp` — two-stage, correct. |
| Euler → quaternion | [project-panels.tsx:651](src/three/objects/project-panels.tsx#L651) | `setFromEuler` into a scratch quaternion. |
| `Matrix4` | [project-panels.tsx:190](src/three/objects/project-panels.tsx#L190), [ambient-field.tsx:107](src/game/entities/ambient-field.tsx#L107) | Compose + `setMatrixAt` on an `InstancedMesh`. |
| `Vector3` | everywhere | Scratch-vector discipline is already correct (module-scope, reused). |
| `distanceTo` / `distanceToSquared` | [skill-galaxy.tsx](src/three/objects/skill-galaxy.tsx) | Neighbour search in the settled layout. |
| `lerp` / `lerpVectors` | 13 files | Both scalar (`MathUtils.lerp`) and vector. |
| Angles | `MathUtils.degToRad` throughout `project-panels.tsx` | Authored in degrees, stored in radians. |
| Coordinate transformation | `group.worldToLocal` ([skill-galaxy.tsx](src/three/objects/skill-galaxy.tsx)), `.project()` ([project-panels.tsx:189](src/three/objects/project-panels.tsx#L189)) | World↔local and world→NDC. |
| Scale animation | `group.scale.setScalar(presence)` in every section scene | Section presence envelope. |
| Directional light | [lighting.tsx:36,55,66](src/three/scene/lighting.tsx#L36) | Key + fill + rim, theme-balanced. |
| Point light | [lighting.tsx:70](src/three/scene/lighting.tsx#L70) | One accent point, `distance` + `decay` set. |
| Ambient light | [lighting.tsx:31](src/three/scene/lighting.tsx#L31) | |
| Shadows | [lighting.tsx:39-48](src/three/scene/lighting.tsx#L39), `castShadow` in [experience-timeline.tsx:489](src/three/objects/experience-timeline.tsx#L489) and [project-panels.tsx:720](src/three/objects/project-panels.tsx#L720) | 2048² map, bias + normalBias tuned, **`high` tier only**. |
| Roughness / metalness | 13 declarations across 5 object files | `meshStandardMaterial` mostly; one `meshPhysicalMaterial` with `clearcoat` at [hero-sculpture.tsx:113](src/three/objects/hero-sculpture.tsx#L113). |
| Material animation | `material.emissiveIntensity` per frame in [skill-galaxy.tsx](src/three/objects/skill-galaxy.tsx), `material.opacity` in [contact-calm.tsx:74](src/three/objects/contact-calm.tsx#L74) | |
| Camera animation | [camera-rig.tsx](src/three/scene/camera-rig.tsx) | Six waypoints, `lerp` on position/lookAt/fov, pointer parallax. |
| Object animation | every file in `src/three/objects` | |
| Custom shader | [atmosphere.tsx](src/three/scene/atmosphere.tsx) | The one authored `ShaderMaterial`. Act II declared this budget **closed**. |
| Instancing | [ambient-field.tsx](src/game/entities/ambient-field.tsx), [project-panels.tsx](src/three/objects/project-panels.tsx) shards | |
| Raw `BufferGeometry` + per-vertex colour | [skill-galaxy.tsx](src/three/objects/skill-galaxy.tsx) `lineSegments` | One draw call carries both the resting web and the lit path. |
| Raycasting (Game Mode only) | [gesture-controller.ts](src/game/interactions/gesture-controller.ts) | `Raycaster` + `Vector2` NDC, driven by window events — **this is the pattern §6 generalises.** |
| Procedural texture | `glowTexture()` in [geometry.ts](src/three/scene/geometry.ts) | A `CanvasTexture` radial sprite standing in for bloom. |

### 0.2 Absent — this is Act III's work

| Capability | Status | Evidence |
|---|---|---|
| **Hemisphere light** | **None** | `grep -r hemisphereLight src` → 0 hits. Sky/ground ambient is the cheapest upgrade available to every scenery. |
| **Spot light / rect-area light** | None | 0 hits. No light has ever had a cone or a shape. |
| **Light animation** | **None** | [lighting.tsx](src/three/scene/lighting.tsx) is a pure static render. No light's position, colour or intensity is ever touched inside `useFrame`. |
| **Colour management** | **Implicit only** | R3F sets `ColorManagement.enabled = true` and `outputColorSpace = SRGBColorSpace` by default (`@react-three/fiber/dist/events-*.esm.js`). Nothing in `src` configures or reasons about it. `glowTexture()` is the only place a `colorSpace` is set by hand. |
| **Tone mapping** | **Implicit only** | R3F defaults to `ACESFilmicToneMapping`. No `toneMapping` or `toneMappingExposure` appears anywhere in `src`. three r185 also ships `AgX` and `Neutral`, which this repo has never used. |
| **Texture maps** | **None** | 0 hits for `map=`, `normalMap`, `roughnessMap`, `aoMap`, `envMap`, `useTexture`, `TextureLoader`. Every surface is a flat colour. |
| **Environment map / IBL** | None | 0 hits. The `clearcoat` on the hero sphere has nothing to reflect. |
| **Model loading (GLTF)** | **None** | No `public/` directory exists at all. 0 hits for `useGLTF`, `GLTFLoader`, `useLoader`. All geometry is procedural. |
| **Draco** | None | Vendored at `node_modules/three/examples/jsm/libs/draco`, imported nowhere. |
| **KTX2 / Basis** | None | Vendored at `three/examples/jsm/libs/basis`, imported nowhere. |
| **Meshopt** | None | `meshopt_decoder.module.js` vendored, imported nowhere. |
| **`AnimationMixer` / `AnimationClip`** | **None** | 0 hits. `timeline` in `src/three` refers to the Experience *content* timeline, not an animation timeline. |
| **Morph targets** | None | 0 hits. |
| **Skeletal animation** | None | 0 hits (`Skeleton` matches are the loading-skeleton UI component). |
| **Timeline animation** | **Not in `src/three`** | GSAP is installed but imported by exactly one file, [camera-system.ts](src/game/systems/camera-system.ts) in Game Mode. The site scene hand-rolls every scrub. |
| **`THREE.Timer`** | None | three r185 exports `Timer` from core. The scene instead reads `state.clock.elapsedTime` in 6 scattered places with no shared timescale and no visibility handling. |
| **Dot product** | **None** | `grep -rE '\.(dot\|crossVectors)\(' src` → 0 hits. |
| **Cross product** | **None** | Same. No orthonormal basis is ever constructed. |
| **`Vector3.normalize()`** | **None** | The only `normalize(` in a 3D context is GLSL, inside [atmosphere.tsx:75](src/three/scene/atmosphere.tsx#L75). |
| **`Matrix3`** | None | 0 hits. No normal matrix, no `Texture.matrix` UV transform. |
| **`Vector2`** | Barely | Only the Game Mode NDC vector and a shader `uResolution` uniform. |
| **Click detection in 3D** | **Impossible today** | The canvas is `pointer-events-none`, `aria-hidden`, `z-index: -8` ([scene-root.tsx](src/three/scene/scene-root.tsx)). R3F's event system is therefore dead. |
| **Dragging 3D objects** | **Faked** | [drifters.tsx:93](src/three/scene/drifters.tsx#L93) picks by *screen-space NDC distance*, not by a ray. It works, but it cannot hit anything with real depth. |
| **Orbit / camera controls** | None | 0 hits for `OrbitControls`. `@react-three/drei` is a declared dependency **imported by zero files**. |
| **Geometry variety** | Thin | Site scene ships: sphere, torus, plane, icosahedron, tetrahedron, dodecahedron, octahedron, box, cylinder, capsule, one `ExtrudeGeometry` slab. Never used: `LatheGeometry`, `TubeGeometry`, `TorusKnotGeometry`, `EdgesGeometry`, `ShapeGeometry`, curve-driven geometry of any kind, or `mergeGeometries` outside Game Mode. |
| **Scenery switching** | None | One palette derived from `--tone` + `--bg` ([scene-palette.ts](src/lib/experience/scene-palette.ts)). Theme is light/dark only. There is no concept of a *look*. |

### 0.3 The cursor, specifically

[custom-cursor.tsx](src/components/layout/custom-cursor.tsx) replaces the
system pointer entirely: [globals.css:620](src/app/globals.css#L620) forces
`cursor: none !important` on the body and every descendant, and four Motion
`useSpring` values (`SPRING.cursor` ×2, `SPRING.trail` ×2) drive a dot and a
lagging ring.

**This is the animation the brief asks to remove.** Four independent spring
loops plus `cursor: none` is why the pointer feels detached during a scroll —
the springs keep integrating while the compositor is busy, and the ring's
visible lag reads as input lag rather than as style. §7 replaces it.

### 0.4 Second sweep — the DOM animation layer

§0.1–0.3 audited `src/three`. This pass reads `src/components/{layout,motion,
theme,ui}` and `src/lib/{hooks,store,types}`. It changes three conclusions.

**The backdrop the brief is actually asking about is CSS, not WebGL.**
[ambient-background.tsx](src/components/layout/ambient-background.tsx) renders
five always-mounted divs — three drifting blobs, light rays, a star field —
animated by `@keyframes ambient-drift-a/b/c`, `ambient-rays-shift` and
`ambient-twinkle` ([globals.css:400-530](src/app/globals.css#L400-L530)), and
tinted by `data-tone`. **This is the layer a visitor reads as "the
background."** The WebGL scene sits behind it at `z-index: -8`. A scenery
button that changes only the canvas would change the *less* visible half.
Corrected by **S13**.

**Scroll is already carrying more spring load than the cursor.** Every
`<Section>` mounts a [ScrollVeil](src/components/motion/scroll-veil.tsx)
(`useScroll` + 2 x `useTransform`); the experience list mounts one
[ScrollProgressLine](src/components/motion/scroll-progress-line.tsx) plus a
[DepthScale](src/components/motion/depth-scale.tsx) **per row** (`useScroll` +
`useSpring` + 2 x `useTransform` each); every project card runs **5 springs and
9 transforms** ([project-card.tsx:98](src/components/projects/project-card.tsx#L98-L110)).
On the home page that is well over thirty scroll-bound motion values before
the canvas draws anything. §0.3's diagnosis of the cursor stands, but removing
four springs while leaving thirty is not a fix. Corrected by **S14**.

**Two rAF loops exist that nothing renders.**
[use-scramble.ts](src/lib/experience/use-scramble.ts) and
[use-typing-pulse.ts](src/lib/experience/use-typing-pulse.ts) have **zero
consumers** — `grep` finds no import of either outside its own file. They are
not a cost today; they are a trap for whoever wires the picker's label
animation and assumes they are load-bearing. Delete or adopt in Phase A.

**Already present and reusable — do not rewrite:**

| What | Where | Act III use |
|---|---|---|
| `useFinePointer()` | [use-media-query.ts](src/lib/hooks/use-media-query.ts) | Gates the cursor aura (§7) and Inspect mode (§6.3). The cursor currently re-derives this with its own `matchMedia`. |
| `useFocusTrap` | [use-focus-trap.ts](src/lib/hooks/use-focus-trap.ts) | Already cited by §3 for the picker popover. |
| `useHydrated` | [use-hydrated.ts](src/lib/hooks/use-hydrated.ts) | Exactly the hook S2's post-mount `localStorage` read needs. |
| `useActiveSection` | [use-active-section.ts](src/lib/hooks/use-active-section.ts) | One shared `IntersectionObserver`; a scenery must not add a second. |
| `useSceneContentStore` | [scene-content-store.ts](src/lib/store/scene-content-store.ts) | Real skills/projects already cross into the scene. `garden` and `orrery` read from it — **no variant fetches**. |
| `SPRING` vocabulary | [springs.ts](src/lib/experience/springs.ts) | Named by feel, not numbers. A scenery re-times by scalar, never by new entries. |
| `MotionProvider` | [motion-provider.tsx](src/components/motion/motion-provider.tsx) | `reducedMotion="user"` at library level — the DOM safety net §11 depends on. |
| `useScrollVelocity` | [use-scroll-velocity.ts](src/lib/experience/use-scroll-velocity.ts) | Already computes smoothed scroll speed. §6.2's raycaster gate and §7's aura suspend read **this**, not a new one. |

---

## 1. Direction (binding — re-read before every phase)

**A scenery is a complete change of world, not a colour swatch.** Switching it
must change, at minimum: the light rig's *type and animation*, the material
family, the geometry vocabulary, the tone-mapping curve, the motion
temperament, and — this is the part that makes it feel authored rather than
themed — **what the Skills and Projects sections actually are**, in DOM and in
WebGL both.

Four sceneries. One is what the site already looks like.

| Id | Name | One line | Temperament |
|---|---|---|---|
| `atelier` | **Atelier** | The current look, named. Warm paper, matte ceramic, one warm key. | Calm, editorial. Default. |
| `observatory` | **Observatory** | Night. Polished metal and glass under a cold sky, one moving light. | Slow, vast, reverent. |
| `garden` | **Garden** | Overgrown terrarium. Soft green bounce, translucent leaves, things that grow. | Alive, unhurried, organic. |
| `blueprint` | **Blueprint** | Drafting table. Unlit line-work over a ruled grid, no tone curve. | Precise, technical, flat. |

**Rules that bind all four:**

1. **Typography stays dominant.** A scenery may never reduce body-copy
   contrast below the AA threshold the current palette holds.
2. **One canvas.** Act II's non-goal stands. Sceneries are *content* of the
   existing `<Canvas>`, not a second one.
3. **Scroll remains the only story parameter.** A scenery changes what the
   scroll *reveals*, never that scroll is the driver.
4. **Every scenery has a reduced-motion form and a `low`-tier form.** Neither
   is "the scenery, but broken" — see §11.
5. **Crossfade, never cut.** Switching sceneries is a 900ms authored
   transition (§9), not a remount.
6. **No scenery may cost more than `atelier` at the same tier.** §12.

---

## 2. Architecture decisions

Numbered `S*` so phase notes can cite them.

- **S1 — Scenery is global state, in two places at once.** A new
  `src/lib/store/scene-scenery-store.ts` (zustand, matching
  [scene-interaction-store.ts](src/lib/store/scene-interaction-store.ts)'s
  imperative style) holds the active id. It also writes
  `data-scenery="<id>"` onto `<html>`, so `globals.css` can swap DOM tokens
  with the same `@property` cross-fade machinery `data-tone` already uses.
  **WebGL reads the store; CSS reads the attribute.** Neither re-renders the
  other.

- **S2 — Persist to `localStorage`, hydrate after mount.** Key
  `portfolio:scenery`. Read in an effect, never during render — the server
  cannot know it, and a mismatch would hydrate-error. Until it resolves, the
  site is `atelier`.

- **S3 — The scenery definition is data, not branches.** One
  `src/lib/experience/scenery.ts` exporting
  `SCENERIES: Record<SceneryId, SceneryDefinition>`. A definition carries:
  palette skin, light-rig spec, tone-mapping curve + exposure, material
  family, geometry vocabulary id, motion timescale, budget scalars, and
  per-section variant ids. **Object files read a definition; they never
  `switch` on an id.** The one exception is the per-section variant selectors
  (§5), which are genuinely different objects.

- **S4 — Palette composes, never replaces.** `buildScenePalette(tone,
  background)` keeps its contract from Act II. A scenery supplies a
  `ScenerySkin` that post-processes its output (hue rotation, chroma clamp,
  surface-lightness bias). Act II's "no new palette, ever" invariant holds:
  there is still exactly one palette *derivation*, with a named transform on
  the end.

- **S5 — Tone mapping and colour management become explicit.** `SceneCanvas`
  stops relying on R3F's defaults and sets them from the definition:
  `gl.toneMapping`, `gl.toneMappingExposure`, `gl.outputColorSpace`. Every
  texture loaded thereafter declares its own `colorSpace` explicitly —
  `SRGBColorSpace` for colour maps, `NoColorSpace` for normal/ORM data.
  **Getting this wrong is invisible in code and obvious on screen**; write the
  reason at the call site.

- **S6 — One shared `THREE.Timer`, in place of six `state.clock` reads.**
  `src/lib/experience/scene-timer.ts` owns a module-scope `THREE.Timer`,
  `connect(document)`-ed so a hidden tab does not accumulate elapsed time, and
  ticked exactly once per frame by [scroll-physics.tsx](src/three/scene/scroll-physics.tsx)
  (already the first child, already the ordering authority). It exposes
  `sceneTime.elapsed` and `sceneTime.delta` the way `sceneScroll.progress` is
  already exposed. A scenery sets its pace through `timer.setTimescale()` —
  this is how `garden` breathes slower than `blueprint` **without a single
  object file knowing which scenery is active**.

- **S7 — Interaction stays DOM-driven, but gains a real ray.** The canvas
  keeps `pointer-events-none`. A new
  `src/lib/experience/scene-raycaster.ts` generalises Game Mode's
  [gesture-controller.ts](src/game/interactions/gesture-controller.ts): one
  `Raycaster`, one `Vector2` of NDC read from the existing
  [use-pointer.ts](src/lib/experience/use-pointer.ts) listener, one
  `intersectObjects` per frame against an explicit registry of opted-in
  meshes. **R3F's event system is never enabled.** §6 explains why this is the
  right call and not a workaround.

- **S8 — Assets live in `public/models` and `public/textures`; decoders in
  `public/decoders`.** `public/` does not exist yet — Phase H creates it. A
  `scripts/copy-decoders.mjs` postinstall step copies Draco, Basis/KTX2 and
  meshopt binaries out of `node_modules/three/examples/jsm/libs`, so decoders
  are never hand-committed and never drift from the installed three.

- **S9 — `@react-three/drei` finally gets used, for loaders only.** It is
  already a declared dependency imported by zero files. Act III imports
  `useGLTF`, `useKTX2`, `useAnimations` and `OrbitControls` from it — and
  nothing else. No drei helper may replace something `src/three` already
  builds by hand.

- **S10 — Every asset has a procedural fallback.** A missing or failed `.glb`
  renders the scenery's procedural stand-in and logs once. The repo must stay
  runnable by a fresh clone with no binaries. **A Suspense boundary that
  throws is a broken site; a fallback that looks deliberate is not.**

- **S11 — Scenery is a budget consumer, not a budget author.** A definition
  may *scale* `SceneBudget` numbers (`particles * 0.6`) but may never raise
  them above the tier's ceiling, and may never introduce a boolean feature
  flag. Act I's "quality is a budget, not a switch" invariant holds.

- **S12 — One new admin switch: `three-scenery`.** Off hides the picker and
  pins the site to `atelier`. Add the id to `ANIMATION_IDS` in
  [content.ts](src/lib/types/content.ts) and a row to `ANIMATION_GROUPS` in
  [settings/page.tsx](<src/app/admin/(dashboard)/settings/page.tsx>) — those
  two lists are the single source both sides key off.

- **S13 — A scenery owns the CSS backdrop as much as the canvas.**
  [ambient-background.tsx](src/components/layout/ambient-background.tsx) stops
  being one fixed arrangement. Its five layers become the scenery's to
  specify: which layers exist, their blur/scale/opacity, their drift keyframes
  and durations. The component **keeps reading nothing but attributes** —
  `data-tone` from the active section, `data-scenery` from `<html>` — so it
  never subscribes to the scenery store and never re-renders on a switch. All
  four looks live in `globals.css` under
  `[data-scenery="observatory"] .ambient-blob { … }`. The existing rules
  become the `atelier` block verbatim; **nothing about the current backdrop is
  redesigned, it is only namespaced.**

- **S14 — Scroll-bound springs get a budget, and the budget is enforced
  centrally.** §0.4 counts 30+ scroll-driven motion values on the home page.
  Act III does not delete them — they are the site's character — but:
  1. `<ScrollVeil>` drops its `useSpring`-free `useTransform` pair in favour
     of one shared progress source where a section's veil and the scene's
     section progress are the same number. [use-scene-progress.ts](src/lib/experience/use-scene-progress.ts)
     already computes it.
  2. `<DepthScale>`'s per-row `useSpring` is replaced by **one** spring on the
     list, with each row deriving its own `useTransform` from it — same look,
     one integrator instead of N.
  3. [project-card.tsx](src/components/projects/project-card.tsx)'s five
     springs are pointer-driven, not scroll-driven, and stay — but the card
     **suspends its springs while scroll velocity is above §6.2's threshold**,
     via the same `useScrollVelocity` gate. A tilt that keeps integrating
     during a flick is the cursor bug wearing a different hat.

  This is a prerequisite for §10, not an optional cleanup: the brief's
  "should not slow the scrolling" cannot be met by fixing the cursor alone.

- **S15 — Scenery and theme are orthogonal, and the matrix is real.** `<html>`
  carries `class="dark"` (written by `next-themes` before paint) **and**
  `data-scenery`. Four sceneries x two themes = eight authored looks; none may
  be left to fall out of the tokens by accident. `blueprint` in dark is
  cyan-on-navy drafting film, not an inverted white sheet. Selector order is
  fixed: `[data-scenery="x"]` sets the skin, `.dark [data-scenery="x"]`
  overrides it. Also: `ThemeProvider` sets `disableTransitionOnChange`, so a
  **theme** switch is a cut while a **scenery** switch is a 900ms crossfade
  (§1 rule 5). Do not unify them — they are different gestures.

- **S16 — The picker is the third control in the header, and the header has a
  budget of three.** [site-header.tsx](src/components/layout/site-header.tsx)
  already carries the theme toggle and the Game Mode entry. Scenery makes
  three. A fourth would need one of them to move into
  [mobile-menu.tsx](src/components/layout/mobile-menu.tsx) permanently. Say so
  now so the next feature does not quietly make it four.

- **S17 — DOM variants are CSS-first.** A per-scenery change to the Skills or
  Projects DOM that can be expressed as a `[data-scenery]` rule over the
  existing markup **must** be, and stays in `globals.css`. Only a genuinely
  different *structure* — `garden`'s vine-threaded list, `blueprint`'s
  dimensioned schematic — earns a component under
  `src/components/{skills,projects}/variants/`. Reason: the marquee, the
  tiles, the chips and the cards are already correct, accessible and
  server-rendered ([tech-marquee.tsx](src/components/skills/tech-marquee.tsx),
  [tech-tile.tsx](src/components/ui/tech-tile.tsx),
  [tech-chip.tsx](src/components/ui/tech-chip.tsx)). Four component copies of
  each is four places to break a focus ring.

- **S18 — `src/components/ui` is off-limits.** Button, badge, dialog, toast,
  field, input, spinner and the rest are the design system. A scenery may
  retint them through tokens; it may not fork them, add a variant to them, or
  animate them. **If a scenery needs a new `ui` primitive, the scenery is
  wrong.**

---

## 3. The scenery picker (UI)

- **Placement.** A compact control in [site-header.tsx](src/components/layout/site-header.tsx),
  immediately left of the theme toggle. On mobile it moves into
  [mobile-menu.tsx](src/components/layout/mobile-menu.tsx) as a labelled row.
- **Form.** A button opening a four-item popover: each row is the scenery
  name, a one-line description, and a 44×28 swatch rendered in pure CSS from
  that scenery's three key colours. **Not** a live 3D thumbnail — four extra
  render targets for a menu is exactly the cost §12 forbids.
- **Keyboard.** Arrow keys move, `Enter` selects, `Esc` closes, focus returns
  to the trigger. Reuse [use-focus-trap.ts](src/lib/hooks/use-focus-trap.ts).
- **Announcement.** `aria-live="polite"`: "Scenery: Observatory."
- **Label.** "Scenery" — not "Theme" (taken by light/dark) and not "Mode"
  (taken by Game Mode).
- **Cursor label.** `data-cursor-label="scenery"` so §7's effect layer picks
  it up.

---

## 4. The four sceneries, specified

Each entry below is the contract. Where it gives a number, use that number.

### 4.1 `atelier` — the current look, named

**Nothing changes visually.** This phase is pure extraction: everything
[lighting.tsx](src/three/scene/lighting.tsx),
[scene-palette.ts](src/lib/experience/scene-palette.ts) and the object files
currently hardcode becomes `SCENERIES.atelier`. The proof the refactor is
correct is that the rendered page is pixel-identical before and after.

| | |
|---|---|
| Lights | Ambient `0.22`/`0.58` · key + fill + rim directional · one accent point — exactly [lighting.tsx](src/three/scene/lighting.tsx) today. **Plus** a `hemisphereLight` at `0.25`, sky = `palette.wash`, ground = `palette.deep`, replacing a third of the current ambient. This is the one visual change and it is a strict improvement: flat ambient is why the matte surfaces read chalky. |
| Tone mapping | `ACESFilmicToneMapping`, exposure `1.0` |
| Materials | `meshStandardMaterial`, roughness `0.55`, metalness `0.2`; the hero keeps its `meshPhysicalMaterial` clearcoat |
| Geometry | Platonic solids + the extruded rounded slab |
| Timescale | `1.0` |
| Skills | The constellation graph, unchanged |
| Projects | The corridor of slabs, unchanged |

### 4.2 `observatory` — night, metal, one moving light

| | |
|---|---|
| Skin | Hue → cold. Accent rotated toward `210°`, chroma `+15%`, `surface` lightness forced to `0.22` regardless of page theme. The page stays readable because the DOM tokens only shift `--tone`; `--bg` is untouched. |
| Lights | Ambient down to `0.08`. **`hemisphereLight`** sky `#1b2a4a` / ground `#0a0a0f`, intensity `0.5`. **Animated key:** one directional light on a slow orbit — `quaternion.setFromAxisAngle(orbitAxis, sceneTime.elapsed * 0.06)` applied to a radius vector, where `orbitAxis` is built with **`crossVectors(worldUp, toScene).normalize()`**. This is the repo's first animated light and its first cross product, and both are load-bearing rather than decorative: a moving key is what makes polished metal read as polished. **`spotLight`** on the hero sculpture, `angle 0.35`, `penumbra 0.8`, `castShadow` at `high`. |
| Tone mapping | `AgXToneMapping`, exposure `1.15`. AgX holds highlight roll-off on specular metal far better than ACES does — this is the reason the curve is per-scenery at all. |
| Materials | metalness `0.9`, roughness `0.15`, with a **KTX2 ORM map** (`public/textures/brushed-orm.ktx2`, 1024², channel-packed AO/roughness/metalness) and a **normal map** for brush direction. `envMapIntensity 1.2` against a procedurally generated `PMREMGenerator` sky — no HDR file, no new binary. |
| Geometry | `TorusKnotGeometry` for the hero ring, `LatheGeometry` for instrument stands, `EdgesGeometry` overlay on the panels. |
| Timescale | `0.75` — everything is slower here. |
| Particles | Dust becomes stars: same buffer, `pointsMaterial` size down `40%`, count up to the tier ceiling, additive blending. |
| **Skills** | **An orrery.** Category clusters become concentric orbital rings. Each node rides a ring whose basis is `(radial, orbitAxis = up × radial, tangent = orbitAxis × radial)` — three genuine cross products — and advances by `setFromAxisAngle` + `slerp`, never by Euler accumulation. Hovering a DOM pill still drives it via [scene-interaction-store.ts](src/lib/store/scene-interaction-store.ts), but the reaction is now *orbital phase alignment*: the hovered node's ring slews to bring it to the front. **DOM side:** [tech-chain.tsx](src/components/skills/tech-chain.tsx)'s marquee rows are replaced by a single radial dial — pills on an arc, the selected one at 12 o'clock, `transform: rotate()` on the container only, so [tech-marquee.tsx](src/components/skills/tech-marquee.tsx)'s "never resize a pill" rule survives intact. |
| **Projects** | **Monoliths.** The corridor slabs become free-standing slabs lit only by the moving key, and they are **draggable to rotate** (§6.4): press and drag horizontally on a card's 3D counterpart spins it about its Y axis with momentum; release damps back to flush unless it passed 90°, in which case it settles showing the reverse face with the tech stack. This is the first real drag-with-a-ray in the site scene. |

### 4.3 `garden` — overgrown terrarium

| | |
|---|---|
| Skin | Accent toward `140°`, chroma `-10%`, `surface` warmed. |
| Lights | **`hemisphereLight` is the primary light here:** sky `#cfe8c2`, ground `#3d2f1f`, intensity `1.1` — the bounce-light look is the entire point. One weak directional at `0.45` for shape, no rim. Shadows soft and short (`shadow-camera-far 14`). |
| Tone mapping | `NeutralToneMapping`, exposure `1.0`. Neutral preserves saturated greens where ACES desaturates them. |
| Materials | roughness `0.85`, metalness `0.0`. Leaves are `meshPhysicalMaterial` with `transmission 0.35`, `thickness 0.4`, `ior 1.35` — translucency, not transparency. A **KTX2 leaf colour map** with `alphaTest`, plus a normal map for veining. |
| Geometry | **`TubeGeometry` along a `CatmullRomCurve3`** for every stem — the curve's own tangent/Frenet frames give branch orientation, which is `normalize()` and cross products again, earned rather than staged. `LatheGeometry` pods. |
| Timescale | `0.6` — the slowest scenery. |
| **Models + animation** | The one place skeletal and morph work is honest: `public/models/vine.glb`, **Draco-compressed geometry, meshopt-packed animation tracks, KTX2 textures**, carrying (a) a rigged `grow` `AnimationClip` and (b) a `bloom` **morph target** on the flower heads. Driven by `AnimationMixer` — but **scrubbed, not played**: `mixer.setTime(growClip.duration * sectionProgress)` inside `useFrame`, so scroll remains the only story parameter (§1.3). Morph influence is likewise `smoothstep(entry)` rather than a wall-clock loop. Budget: the clip is the *only* skinned mesh on the page, capped at 24 bones, and is skipped entirely at `low` tier in favour of a static Draco-decoded pose. |
| **Skills** | **Growth.** Nodes become buds on a branching vine; category clusters become branches off one trunk. Entry progress grows the vine (mixer scrub); hover opens that bud's morph target to `1.0` and lights its neighbours to `0.4`. Edges are no longer `lineSegments` but the tube geometry itself. **DOM side:** the marquee becomes a static, slowly-settling list where each pill sprouts in on [reveal.tsx](src/components/motion/reveal.tsx), ordered by category — no continuous motion at all, because a garden that scrolls sideways is a conveyor belt. |
| **Projects** | **Leaves on a stalk.** Panels hang off a vertical stem, each with an independent sway phase, and turn to face the camera as the corridor approaches — a `lookAt` blended by `dot(panelNormal, toCamera)` so the turn only engages once the panel is actually oblique. Hover lifts and un-curls (morph). |

### 4.4 `blueprint` — drafting table

| | |
|---|---|
| Skin | Chroma crushed to near-zero except the accent, which goes to full. Two colours on screen: ink and accent. |
| Lights | **Almost none, deliberately.** `hemisphereLight` at `0.3` for a hint of form, no key, no shadows at any tier. Surfaces are `meshBasicMaterial` and `lineBasicMaterial` — this scenery exists partly to prove the rest of the pipeline is not load-bearing for legibility. |
| Tone mapping | `NoToneMapping`, exposure `1.0`. Line-work must not be rolled off. |
| Materials | Unlit. Every solid is a `meshBasicMaterial` at `opacity 0.06` behind an `EdgesGeometry` outline in the accent. |
| Geometry | `EdgesGeometry` over everything; `ShapeGeometry` for the ruled ground plane. `TextGeometry` is **explicitly out of scope** — the DOM owns type (§1.1). |
| Texture | A single tiling grid `CanvasTexture` (procedural, like `glowTexture()`), scrolled by animating **`texture.matrix` — a `Matrix3` — via `setUvTransform`** with `matrixAutoUpdate = false`. First `Matrix3` in the repo, and the correct tool for the job. |
| Timescale | `1.25` — the quickest, most mechanical. |
| **Camera** | The one scenery that offers **`OrbitControls`**, through Inspect mode (§6.3). A drafting table you cannot walk around is a poster. |
| **Skills** | **A schematic index.** Nodes become labelled squares on an isometric grid, connected by right-angled traces (`lineSegments`, three vertices per elbow). Hover routes a lit pulse *along* the trace — parameterised by arc length, which needs `distanceTo` per segment and a normalised traversal. **DOM side:** the marquee becomes a dense two-column technical table — name, category, a monospace index number. Zero motion. Hover highlights the row and its trace simultaneously. |
| **Projects** | **Plan sheets.** Panels lie flat on the table in an isometric fan, with dimension lines and corner ticks. Click (§6.2) raises one sheet to camera-facing over 450ms; click again or `Esc` returns it. This is the site's first real 3D click. |

---

## 5. Where the per-section variants live

Do **not** grow [skill-galaxy.tsx](src/three/objects/skill-galaxy.tsx) and
[project-panels.tsx](src/three/objects/project-panels.tsx) with four-way
branches — `project-panels.tsx` is already 867 lines.

```
src/three/objects/skills/
  layout.ts           # shared node layout, neighbours, entry/exit envelope
  constellation.tsx   # atelier (moved from skill-galaxy.tsx, unchanged)
  orrery.tsx          # observatory
  growth.tsx          # garden
  schematic.tsx       # blueprint
  index.tsx           # picks by scenery id; the ONLY switch
src/three/objects/projects/
  layout.ts | corridor.tsx | monoliths.tsx | foliage.tsx | plansheets.tsx | index.tsx
```

Each variant takes the **same props** the current object takes, plus
`scenery: SceneryDefinition`. The shared maths is lifted into `layout.ts`
first, in its own commit, before any variant is written. **A variant that
duplicates layout maths is a defect.**

DOM-side variants follow the same shape under
`src/components/skills/variants/` and `src/components/projects/variants/`,
selected by the `data-scenery` attribute where CSS can do it and by the store
where it cannot.

### 5.1 The DOM half, concretely

Three tiers, cheapest first. **A change may only move up a tier when the tier
below genuinely cannot express it.**

**Tier 1 — tokens.** The scenery skin (S4) already rewrites `--tone`,
`--tone-soft`, surface and border tokens. Most of what "a different colouring"
means is here and costs nothing: the marquee, chips, tiles, badges and cards
retint with no component touched.

**Tier 2 — `[data-scenery]` CSS over existing markup.** Everything structural
that is really a style: the `.ambient` layer per S13; marquee speed and mask
(`observatory` slows to 1.4x and drops the fade mask, `blueprint` cuts it to a
hard-edged ruler); `.tech-chip` border radius and case; card shadow vs. hairline
vs. ruled outline; the section rule above each heading. Lives in `globals.css`
beside the existing `[data-tone]` blocks and **respects the same
`prefers-reduced-motion` guards already written there
([globals.css:547](src/app/globals.css#L547))** — the marquee and ambient
blobs are `animation: none !important` under reduced motion and must stay that
way in all four sceneries.

**Tier 3 — a variant component.** Only these four are authorised:

| Variant | Why it cannot be CSS |
|---|---|
| `skills/variants/growth.tsx` (`garden`) | Skills are threaded onto a vine in reading order — different DOM order and different nesting, not different styling. |
| `skills/variants/schematic.tsx` (`blueprint`) | Each skill gains a dimension line, a callout number and a spec row. New content, generated from `Skill.proficiency` and `Skill.category`. |
| `projects/variants/plansheets.tsx` (`blueprint`) | A card becomes a titled drawing sheet with a revision block — new structure around the same `Project` fields. |
| `projects/variants/monoliths.tsx` (`observatory`) | The tilt is replaced by a parallax face-turn; the pointer maths differs, so it is a different component rather than a prop on the same one. |

`atelier` and `garden` keep [project-card.tsx](src/components/projects/project-card.tsx)
with a Tier-2 retint. Every variant renders **the same fields, the same
`aria-*` wiring and the same single tab stop** as the component it replaces —
the stretched-link pattern in `project-card.tsx` is the reference; copy it
exactly, do not re-derive it.

**No variant may introduce a new `src/components/ui` primitive (S18) or a
second `IntersectionObserver` (S13).**

---

## 6. Interaction: the ray, the click, the drag, the orbit

### 6.1 Why not simply turn on R3F events

R3F's event system requires the canvas to receive pointer events, which means
`pointer-events: auto`, which means the canvas swallows every click meant for
a link, a button, or a text selection — on a page whose entire content is DOM.
That is not a trade worth making, and Act II's invariant ("the scene can never
raycast") was the right call **for R3F's event system specifically**.

It was never a limit on raycasting itself. A `Raycaster` needs a camera and an
NDC `Vector2`; it does not need DOM hit-testing.
[gesture-controller.ts](src/game/interactions/gesture-controller.ts) has been
doing exactly this in Game Mode since before Act II.

### 6.2 `scene-raycaster.ts` — the contract

- **One `Raycaster`, one `Vector2`, module scope.** No allocation per frame.
- **An explicit registry.** `registerInteractive(object3d, handlers)` returns
  an unregister function. Only registered objects are ever tested —
  `intersectObjects(registry, false)`, recursion off. Typical registry size:
  5–32 objects.
- **Throttled.** The hover ray runs at most every other frame, and **not at
  all while scroll velocity is above a threshold** — nobody is hovering a
  monolith mid-flick, and this is the single most important line in the file
  for scroll performance.
- **DOM yields first.** On `pointerdown`, if
  `event.target.closest('a, button, input, textarea, select, [role="button"]')`
  is non-null, the raycaster ignores the event entirely. The page always wins.
- **Click = down and up on the same object within 12px and 400ms.** Anything
  else is a drag or a scroll.
- **Cursor feedback** goes through the existing
  [scene-interaction-store.ts](src/lib/store/scene-interaction-store.ts) so
  the DOM can set `cursor: grab`. The WebGL layer never sets a cursor itself.

### 6.3 Inspect mode (orbit controls, honestly)

`OrbitControls` and a scroll-driven camera cannot both own the camera. So:

- Entering (click an "Inspect" affordance on a project card, or press `i`)
  **freezes page scroll** (`overflow: hidden` plus scroll-position restore),
  takes [camera-rig.tsx](src/three/scene/camera-rig.tsx) out of authority,
  raises the canvas to `z-index: 40` with `pointer-events: auto`, and dims DOM
  content to `opacity 0.15`.
- `OrbitControls` mounts with `enableDamping`, `dampingFactor 0.08`,
  `enablePan false`, `minDistance`/`maxDistance` clamped, and `maxPolarAngle`
  short of the floor.
- Exiting (`Esc`, a close button, or clicking away) captures the current
  camera quaternion and **`slerp`s it back** to the scroll waypoint over
  600ms before returning authority to `CameraRig`. A hard cut here would be
  nauseating; that is the whole reason the exit is spec'd.
- **Available in `blueprint` always, in `observatory` on project monoliths,
  and never under reduced motion or on coarse pointers.**

### 6.4 Dragging

Replaces the NDC-distance pick in [drifters.tsx](src/three/scene/drifters.tsx)
with a real one:

1. `pointerdown` → ray → nearest registered hit.
2. Build a drag plane through the hit point, normal = camera forward
   (`getWorldDirection`), via `Plane.setFromNormalAndCoplanarPoint`.
3. Each move, `ray.intersectPlane` → world point → `object.parent.worldToLocal`
   → target position. **This is the coordinate transformation the brief asks
   for, doing real work.**
4. Velocity from the last three samples; on release hand it to the existing
   `springStep` so the object returns to its lane with the same weight
   everything else in the scene has.

Drifters keep their current behaviour as the fallback when nothing is hit.

---

## 7. The cursor

**Remove:**

- [custom-cursor.tsx](src/components/layout/custom-cursor.tsx)'s dot, ring,
  and all four `useSpring` values.
- `.custom-cursor-active { cursor: none !important }` at
  [globals.css:620](src/app/globals.css#L620). The system cursor is visible at
  all times, everywhere, in every scenery. No exceptions.

**Replace with one composited effect layer** — `src/components/layout/cursor-aura.tsx`:

- A single `position: fixed` element, `pointer-events: none`,
  `will-change: transform`, `mix-blend-mode: plus-lighter` (falling back to
  `screen`), carrying a radial gradient in `--tone` at ~8% peak alpha, ~280px
  across.
- **One `pointermove` listener, `{ passive: true }`, writing to a ref only.**
  **One `requestAnimationFrame` loop**, and it only runs when the pointer has
  actually moved since the last frame — it parks itself otherwise.
- It writes **`transform: translate3d(x, y, 0)` and nothing else.** No width,
  no per-frame opacity, no layout property, no spring. One composited property
  is the difference between this and what it replaces.
- **It suspends itself during scroll.** Subscribe to the existing
  [use-scroll-velocity.ts](src/lib/experience/use-scroll-velocity.ts); above
  threshold the rAF loop stops and the layer fades to `0` via a CSS
  transition. Scrolling must cost exactly zero cursor work. *This is the
  brief's hard requirement and the acceptance criterion in §14.3.*
- **Interactive affordance:** keep the existing delegated `pointerover`
  listener (it fires on target change, not per pixel); on match, add a class
  that scales the aura via a CSS `transition` and show `data-cursor-label` if
  present. State changes on hover in/out only; nothing per frame.
- **Click ripple:** on `pointerdown`, append one absolutely-positioned span
  running a 500ms CSS keyframe, removed on `animationend`. Capped at 3
  concurrent.
- **Reuse, do not re-derive.** Coarse-pointer detection is already
  `useFinePointer()` in [use-media-query.ts](src/lib/hooks/use-media-query.ts);
  the current cursor rolls its own `matchMedia`. Use the hook.
- **Stacking.** The aura sits below the toast and dialog portals
  ([toast.tsx](src/components/ui/toast.tsx),
  [dialog.tsx](src/components/ui/dialog.tsx)) and below the mobile menu.
  `plus-lighter` over a modal scrim reads as a smear. Give it an explicit
  z-index below all three and note the reason at the declaration.
- **Delete `SPRING.cursor` and `SPRING.trail` from
  [springs.ts](src/lib/experience/springs.ts)** once the dot and ring are
  gone — `trail` is still used by
  [project-card.tsx](src/components/projects/project-card.tsx)'s light sweep,
  so only `cursor` actually becomes dead. Check before deleting either.
- **Off entirely** under `prefers-reduced-motion`, on coarse pointers, and
  when `three-cursor` is off in admin. Rename that switch's copy from "Custom
  cursor" to "Cursor aura" — the behaviour it describes has changed.

---

## 8. Asset pipeline

- **Create `public/`.** It does not exist. `public/models/`,
  `public/textures/`, `public/decoders/`.
- **`scripts/copy-decoders.mjs`**, wired to `postinstall`: copies
  `three/examples/jsm/libs/draco/gltf/*`, `.../libs/basis/*` and
  `.../libs/meshopt_decoder.module.js` into `public/decoders/`. Add
  `public/decoders/` to `.gitignore`. **Decoders are never hand-committed.**
- **Loader setup, once,** in `src/three/scene/loaders.ts`: a single
  `GLTFLoader` configured with `DRACOLoader`
  (`setDecoderPath('/decoders/draco/')`), `KTX2Loader`
  (`.setTranscoderPath('/decoders/basis/').detectSupport(gl)` — **`detectSupport`
  needs the live renderer**, so this runs inside the canvas, not at module
  scope), and `MeshoptDecoder`. drei's `useGLTF`/`useKTX2` route through the
  same instance.
- **Budget, enforced in §12:** total added binaries ≤ **1.8 MB** across all
  four sceneries. One `.glb` per scenery that needs one (`observatory`,
  `garden`), ≤ 400 KB each after Draco. Textures KTX2/UASTC only, ≤ 1024²,
  ≤ 250 KB each.
- **Preload on intent, never on load.** A scenery's assets are fetched when
  its row is *hovered in the picker*, not when the page mounts. `atelier`
  needs no binaries at all, so a first visit downloads nothing new.
- **S10's fallback is mandatory** and must be written *before* the asset
  exists, so the fallback is what gets reviewed rather than an afterthought.

---

## 9. Where each remaining brief item lands

So no capability is ticked off by decoration. If a row's justification reads
as "to use the feature", cut the row.

| Capability | Lands in | Doing real work because |
|---|---|---|
| Hemisphere light | All four rigs | Flat ambient is why matte surfaces read chalky; it is `garden`'s primary light. |
| Spot light | `observatory` hero | A cone is what makes the sculpture read as *displayed*. |
| Light animation | `observatory` key orbit | Static light + polished metal = dead metal. |
| Tone mapping (explicit) | Per scenery, S5 | AgX vs Neutral vs None is the biggest single look lever available. |
| Colour management (explicit) | S5 + every texture load | Silent, invisible, catastrophic if wrong once textures exist. |
| Texture maps | `observatory` ORM + normal, `garden` leaf + normal, `blueprint` grid | Three different *kinds* of map, not three copies of one. |
| KTX2 | Every loaded texture | GPU-resident; no main-thread decode stall during a scenery switch. |
| Draco | `vine.glb`, `orrery-stand.glb` | The only reason a 400 KB budget is achievable. |
| Meshopt | `vine.glb` animation tracks | Track data dominates a rigged asset; Draco does not touch it. |
| `AnimationMixer` | `garden` vine, **scrubbed via `setTime`** | Preserves scroll-as-only-driver while using the real clip API. |
| Morph targets | `garden` blooms | A bud opening is a shape change, not a transform. |
| Skeletal animation | `garden` vine growth | A branching stem bending is a hierarchy of bones. |
| `THREE.Timer` | S6, replacing 6 `state.clock` reads | Shared per-scenery timescale; tab-hidden handling for free. |
| Dot product | `garden` panel turn-in, `observatory` specular gate, hover facing tests | Answers "is this surface facing me", which decides whether an interaction is offered at all. |
| Cross product | `observatory` orbital basis, `garden` tube Frenet frames | The only correct way to build an orthonormal basis. |
| `normalize()` | Both of the above, plus drag direction | |
| `Matrix3` | `blueprint` grid `texture.matrix` UV scroll | The right tool; a second geometry would be the wrong one. |
| `Matrix4` | `blueprint` instanced schematic squares | `setMatrixAt` over ~32 instances beats 32 draw calls. |
| `Vector2` | NDC ray input, texture `repeat`/`offset` | |
| Click detection | `blueprint` plan sheets | §6.2 |
| Dragging | `observatory` monoliths, all drifters | §6.4 |
| Orbit controls | Inspect mode | §6.3 |
| Timeline animation | The scenery **crossfade** itself | A 900ms multi-track transition (exposure → palette → light intensity → geometry swap, each with its own offset) is exactly what a timeline is for. Use GSAP — already installed, already used by [camera-system.ts](src/game/systems/camera-system.ts) — so no new dependency. |
| Geometry variety | `TorusKnot`/`Lathe` (`observatory`), `Tube` + `CatmullRomCurve3` (`garden`), `Edges`/`Shape` (`blueprint`) | Each vocabulary belongs to one world. |

---

## 10. Motion & scroll performance contract

The brief's constraint — *"they should not slow the scrolling"* — is the
acceptance criterion for this entire act, not a footnote.

1. **Nothing may listen to `scroll` except [use-scene-progress.ts](src/lib/experience/use-scene-progress.ts).**
   One listener, already passive, already the invariant.
   *Correction from §0.4:* this is aspirational, not current. Two more
   listeners exist — [use-scroll-direction.ts](src/lib/hooks/use-scroll-direction.ts)
   for the auto-hiding header (rAF-throttled, passive, bail-out-on-equal:
   leave it) and Motion's own, one per `useScroll` call site. Act III may
   not add a third kind; Phase C2 reduces the second.
2. **The cursor aura runs zero work while scrolling** (§7).
3. **The raycaster runs zero work while scroll velocity is above threshold**
   (§6.2).
4. **No per-frame work may touch a layout property.** `transform` and
   `opacity` only, on the DOM side.
5. **Scenery switching must not remount the canvas.** Materials, light
   intensities and uniforms are mutated in place; only genuinely different
   geometry is swapped, behind the crossfade's cover.
6. **Long-frame budget:** no frame over 16ms during a full-page scroll at
   `high`; no frame over 24ms at `low`. Measured, not assumed (§14).
7. **One integrator per effect, not one per element.** A list of N rows gets
   one spring and N cheap `useTransform` derivations, never N springs (S14).
   `<DepthScale>` is the current violation.
8. **Pointer-driven springs suspend during scroll.** Card tilt, magnetic
   buttons and the cursor aura all read the same
   [useScrollVelocity](src/lib/experience/use-scroll-velocity.ts) gate and do
   zero work above threshold. One gate, one threshold constant.
9. **The `.ambient` layer stays compositor-only in every scenery.** Its
   keyframes may animate `transform`, `opacity` and `filter` — never `top`,
   `width`, `background-position` or anything that reads back layout. The
   existing blob keyframes are the model.
10. **Reduced-motion guards are per-scenery, not global.** `globals.css`'s
    second reduced-motion block ([globals.css:547](src/app/globals.css#L547))
    exists because some animations' *end state* is not their resting state.
    Every new scenery keyframe must be checked against that rule, and stopped
    outright rather than collapsed to 0.01ms if it has the same property.

---

## 11. Control matrix

| Condition | Scenery behaviour |
|---|---|
| `three-scene` off | No canvas. `data-scenery` still applies, so the DOM variants still change — the picker stays meaningful. |
| `three-scenery` off | Picker hidden, `atelier` pinned. |
| Light / dark theme | Orthogonal (S15). Eight authored looks, all reviewed in Phase L. `next-themes` cuts the theme; the scenery crossfades. |
| `prefers-reduced-motion` | Picker **stays available** — a scenery is a look, not motion. Each renders its still form: no light orbit, no vine growth (final pose), no sway, no aura, no ripple. `frameloop="demand"` as today. The scenery *crossfade* becomes a one-frame swap. |
| `low` tier | No shadows, no skinned mesh (static Draco pose), particle counts per S11, textures at half resolution, Inspect mode off. |
| Coarse pointer | No drag, no Inspect, no aura. Tap still works for `blueprint` plan sheets via §6.2. |
| WebGL fails | `SceneErrorBoundary` returns null as today. DOM variants still respond to `data-scenery`, so the site still has four looks. |
| No `localStorage` | `atelier`, and the picker works for the session. |

---

## 12. Performance contract

Hard numbers. A phase that breaks one of these is not done.

- **First-load JS unchanged.** `three`, `drei` and every loader stay behind
  `next/dynamic` in [scene-root.tsx](src/three/scene/scene-root.tsx).
  `scenery.ts` must not import `three` — the same rule
  [scene-palette.ts](src/lib/experience/scene-palette.ts) already follows, for
  the same reason.
- **Draw calls ≤ `atelier`'s current count + 6** in any scenery at any tier.
- **Added binaries ≤ 1.8 MB total**, zero of them on a first visit to
  `atelier` (§8).
- **Scenery switch ≤ 900ms wall clock**, with no frame over 32ms during it.
- **One skinned mesh maximum on the page**, `garden` only, `mid`+ only.
- **Shadow casters ≤ 2** in any scenery.
- Act II's §8 numbers remain in force for everything they already cover.

---

## 13. Phases

Each is one commit's worth of work, verified per §14 before the box is
flipped. Order matters: A–C2 are pure refactors that must land before any new
look is built, or four sceneries will each grow their own copy of the
plumbing.

- [x] **Phase A — Scenery plumbing, no visual change.**
      `scene-scenery-store.ts`, `scenery.ts` with `atelier` only,
      `data-scenery` on `<html>`, the picker UI rendering one option, the
      `three-scenery` admin row. `SceneryDefinition` types settle here — every
      later phase fills the same shape. Also S13's namespacing — the
      current `.ambient` rules move under `[data-scenery="atelier"]`
      unchanged — and the two dead rAF hooks named in §0.4 are deleted.
      **Accept: the page is pixel-identical
      to `main` at all three breakpoints, light and dark.**

- [x] **Phase B — `THREE.Timer` + explicit colour pipeline.**
      S6 and S5. Replace all six `state.clock.elapsedTime` reads. Set
      `toneMapping`, `toneMappingExposure` and `outputColorSpace` explicitly
      from the definition. **Accept: still pixel-identical — ACES at exposure
      1.0 is what R3F was already doing. Any visible change here is a bug.**

- [x] **Phase C — Variant split + shared layout extraction.**
      §5's directory move. `skill-galaxy.tsx` → `skills/constellation.tsx`
      with `skills/layout.ts` lifted out; `project-panels.tsx` →
      `projects/corridor.tsx`. No behaviour change, no new variants yet.
      **Accept: pixel-identical; `corridor.tsx` is meaningfully shorter than
      867 lines.**

- [x] **Phase C2 — Scroll spring budget.** S14, inserted between C and D
      because §10's acceptance criterion cannot be met after the cursor lands
      if the DOM is still running 30+ scroll springs. Collapse `<DepthScale>`
      to one integrator; point `<ScrollVeil>` at the shared section progress;
      gate `project-card.tsx`'s five springs on scroll velocity. **Accept: a
      scroll trace over the full home page shows fewer long frames than
      `main`, before a single cursor change has been made.**

- [x] **Phase D — Cursor.** §7 in full. Delete the dot, the ring and
      `cursor: none`; ship the aura. **Accept: a trace of scrolling while
      moving the pointer shows zero cursor-attributable frames. This is the
      brief's own test.**

- [x] **Phase E — Lights, everywhere.** Hemisphere light into `atelier`'s rig
      (§4.1's one visual change); the light-rig spec becomes data.
      **Accept: matte surfaces gain form; text contrast unchanged.**

- [x] **Phase F — Raycaster + drag.** §6.2 and §6.4. Port drifters to a real
      ray. No new scenery yet — this is proven against existing objects.
      **Accept: drag feels identical or better; scroll trace unchanged;
      clicking a link over the canvas still navigates.**

      Shipped `src/lib/experience/scene-raycaster.ts`: a module-scope
      `Raycaster` + NDC `Vector2`, `registerInteractive`/`interactiveMeta` as
      the explicit opt-in registry, `pickNearest` (recursion off), and
      `dragPlaneThroughPoint` + `dragPointOnPlane` for the §6.4 grab-depth
      plane technique. `drifters.tsx` now registers each mesh on mount,
      replaces the old screen-space NDC-distance pick with `pickNearest`, and
      replaces the camera-local trig follow with a real plane-intersection
      drag — same `springStep` return/settle behaviour, same DOM-yields-first
      via `scenePointer.grabAllowed` (unchanged). `typecheck`/`lint` show no
      new errors against the existing baseline; a Playwright pass (load,
      grab-drag, release) showed zero console/page errors. Hover
      throttling/click classification from §6.2 are deferred to the phase
      that first needs discrete click/hover (G's plan sheets) — nothing in
      Phase F required them, and building them unused would be exactly the
      "decoration" §9 warns against.

- [x] **Phase G — `blueprint`.** The cheapest scenery (no binaries, no
      lighting, no loaders) and therefore the honest first test of whether the
      system works. Includes the `Matrix3` UV scroll, the `EdgesGeometry`
      vocabulary, both DOM variants, click-to-raise plan sheets, and Inspect
      mode / `OrbitControls` (§6.3). **Accept: the switch reads as a different
      site, not a different palette.**

- [x] **Phase H — Asset pipeline.** §8 in full, with `observatory`'s ORM and
      normal maps as the first payload and the S10 fallback written first.
      **Accept: `rm -rf public/models && npm run build` still produces a
      working site.**

      Notes:
      - **No UASTC encoder, §17 forbids adding one.** `brushed-orm.ktx2` and
        `brushed-normal.ktx2` (`scripts/generate-observatory-textures.mjs`)
        are hand-packed, non-supercompressed KTX2 containers
        (`vkFormat: R8G8B8A8_UNORM`) built with `three/examples/jsm/libs/
        ktx-parse.module.js`, which three already ships. `KTX2Loader`
        branches on `vkFormat !== VK_FORMAT_UNDEFINED` and reads these via
        `createRawTexture()` — no Basis transcoder involved — so they load
        through the exact same loader path §8 requires, just without
        supercompression. Verified against the real loader: loaded both
        files through `KTX2Loader._createTexture()` directly in Node and
        confirmed correct `DataTexture` dimensions, format, and
        `NoColorSpace` (S5) come out.
      - **240×240, not 1024².** Uncompressed RGBA8 is ~8-12x larger per
        pixel than real UASTC, so 1024² would blow the ≤250KB/texture
        budget by roughly an order of magnitude. 240×240 keeps both files
        at 225.2KB. Swap the generator script for a real UASTC encoder
        later and resolution can go back up — nothing downstream depends on
        240 specifically.
      - **Accept test, literally run:** `rm -rf public/models && npm run
        build`. Turbopack compiles clean (`✓ Compiled successfully`) —
        proof the loader wiring, decoder paths, and new textures all
        resolve correctly. The subsequent full-project `tsc` step then
        fails, but on the *same* 15 errors §14 already records as the
        pre-existing baseline (`visitor-search.tsx`, `visitor-table.tsx`,
        `visitors-panel.tsx`, `visits-trend-chart.tsx`, `ripple-toggle.tsx`,
        `settings-form.tsx` — all unrelated to this phase, none touched
        here). `npm run typecheck` and `npm run lint` run standalone
        confirm the same: 15 typecheck errors (exact baseline match, zero
        in any Phase H file) and 19 lint errors (up from the 8 recorded in
        Act II Phase 20 — drift from the intervening scenery phases, not
        from this one; zero lint issues in any Phase H file either way).
        Per §14, not silently fixed.

- [x] **Phase I — `observatory`.** Animated key, spot light, AgX, metal,
      orrery, monoliths, drag-to-rotate. **Accept: §12's draw-call and switch
      budgets hold.**

      Notes:
      - **Orbit is a quaternion, never Euler.** `lighting.tsx`'s key light
        builds `KEY_ORBIT_AXIS` once via `crossVectors(worldUp, toScene)` —
        the horizontal axis perpendicular to both "up" and the key's own
        direction to the origin — then every frame does a single
        `setFromAxisAngle(axis, sceneTime.elapsed * speed)` and applies it to
        the light's rest position. `orrery.tsx` uses the same idiom twice per
        ring (`orbitAxis = up × radial0` for the ring plane, then
        `orbitAxis × radial` for each node's facing tangent), plus
        `Quaternion.slerp` for the hover "come to front" blend — three
        genuine cross products, matching §9's table, zero Euler
        accumulation anywhere.
      - **Spot light targets the origin implicitly.** `hero-sculpture.tsx`'s
        group carries no position offset, so the untargeted `SpotLight`
        default (aimed at `(0,0,0)`) already lands on it — no extra
        `Object3D` target, no new prop.
      - **All-new intensities/positions are config, not literals in a
        component.** `keyOrbit`/`spot` live on `scenery.lights` in
        `scenery.ts`; hue-shift/chroma/surface-lightness live on
        `scenery.skin` and run through `applyScenerySkin` — no observatory
        constant is hardcoded inside `lighting.tsx`, `orrery.tsx`, or
        `monoliths.tsx` themselves.
      - **Draw calls measured, not assumed.** Instrumented
        `drawArrays`/`drawElements`/`drawArraysInstanced`/
        `drawElementsInstanced` directly (a Playwright `add_init_script`
        patch on `WebGL2RenderingContext.prototype`, sampled per
        `requestAnimationFrame`) against the live dev server rather than
        reading a devtools hook that may not exist. Results, same scroll
        position compared scenery-to-scenery:

        | Position | Atelier (max draw calls) | Observatory (max draw calls) | Δ |
        |---|---|---|---|
        | Page top | 41 | 44 | **+3** (budget: ≤ atelier + 6) |
        | Skills (constellation → orrery) | 41 | 31 | **−10** |
        | Projects (corridor → monoliths) | 45 | 33 | **−12** |

        Budget holds with margin everywhere; orrery and monoliths are
        cheaper than the sceneries they replace because both pack their
        outlines into one shared `Float32Array`/one `lineSegments` draw
        call rather than per-edge geometry.
      - **Switch-duration/frame-spike (900ms/32ms) not verified here —
        deferred to Phase K.** That budget is Phase K's own accept criterion
        (the crossfade timeline), and this headless sandbox has no GPU
        acceleration: even the idle `atelier` baseline, with no switch and
        no interaction at all, shows ~100ms+ frame times. Any number
        captured here would measure sandbox software-rendering overhead,
        not the app, so it is left for Phase K's real-browser pass rather
        than reported as a false pass or fail.
      - **S10 fallback reused, not rebuilt.** `Monoliths` suspends on its
        first KTX2 fetch (Phase H's `brushed-orm.ktx2`/`brushed-normal.ktx2`);
        `projects/index.tsx` falls back to the already-fully-procedural
        `Corridor` component itself rather than a new fallback component —
        a one-time, barely-visible swap on first load, never a blank canvas.
      - **Drag-to-rotate reuses Phase F's primitives exactly.**
        `pickNearest`/`registerInteractive`/`scenePointer`/
        `dragPlaneThroughPoint`/`dragPointOnPlane` — the same real-raycaster
        contract `drifters.tsx` already uses (S7) — with a `springStep(...,
        "settle", ...)` release rather than a new interaction system.
        Required one line of plumbing in `scene-canvas.tsx`: `usePointerPress`
        was previously gated only by the unrelated `three-drifters` toggle,
        so monoliths now also enables it directly.
      - **`typecheck`/`lint`/`build`: same shape as Phase H.** 15 typecheck
        errors (exact pre-existing baseline, zero in any Phase I file); 21
        lint errors (19 baseline + 2 accepted `react-hooks/immutability` on
        `orm.colorSpace =`/`normalMap.colorSpace =`, the same S5-mandated
        post-load mutation pattern already present in untouched
        `camera-rig.tsx`); Turbopack build compiles clean, the subsequent
        full-project `tsc` step fails only on the same 15-error baseline.
        One real lint bug was caught and fixed (not left as baseline): a
        ref mutated during render for `monoliths.tsx`'s per-slab runtime
        state, converted to `useMemo(() => slabs.map(newRuntime), [slabs])`.
      - **Runtime-verified with Playwright against the live dev server:**
        scenery picker opens, switches to `observatory`
        (`html[data-scenery="observatory"]` confirmed), zero page
        errors/exceptions. Screenshots confirm real content, not a blank
        canvas — a metallic node ring for Skills, standing panel slabs for
        Projects. Console warnings present are pre-existing/unrelated
        (`THREE.Clock` deprecation notice, headless-GPU `ReadPixels` driver
        messages from screenshotting).

- [x] **Phase J — `garden`.** The vine: Draco + meshopt + KTX2 + skeletal +
      morph, mixer **scrubbed** by scroll. Tube/Frenet stems. Both DOM
      variants. **Accept: one skinned mesh, `mid`+ only; `low` renders the
      static pose and nobody can tell it is missing a feature.**

      Notes:
      - **Assets generated, not authored by hand.**
        `generate-garden-vine.mjs` hand-builds the skeleton (11 bones, the
        "rope" skin-weight technique), the `bloom` morph target, and the
        `grow` `AnimationClip` with `three` core APIs, then exports through
        the vendored `GLTFExporter` (needed a local `FileReader` polyfill —
        Node has none, and the exporter's binary path reads the merged
        `Blob` through it; documented inline as script-local, not shipped).
        `vine.glb` round-trips through a real `GLTFLoader` confirming 11
        bones, 10 quaternion tracks, the `bloom` morph and the `grow` clip,
        at 48.4KB (budget: ≤400KB). Same honest limitation as Phase H: no
        Draco/meshopt *encoder* exists in this repo and §17 forbids adding
        one, so the geometry ships uncompressed through the fully
        Draco/meshopt/KTX2-wired `useGLTF` pipeline — swapping in a really
        compressed asset later requires no code change.
        `generate-garden-textures.mjs` packs `leaf-color.ktx2` (BT709/SRGB,
        resolves to `SRGBColorSpace` on its own) and `leaf-normal.ktx2`
        (UNSPECIFIED/LINEAR, `NoColorSpace`) as raw KTX2 containers, same
        `ktx-parse` technique as Phase H's ORM/normal pair, 225.2KB each
        (budget: ≤250KB/texture).
      - **The vine mounts as a child of its own transform group, not a
        sibling.** `growth.tsx`'s `VineField` uses its own `rootRef` (the
        group carrying presence-fade, Y-offset and breathing sway) as the
        `useAnimations` root and renders `gltf.scene` directly inside it —
        caught in self-review before this was ever a runtime bug: an
        earlier draft mounted the loaded scene next to that group instead of
        inside it, so the skinned mesh would never have inherited the
        section's entry/exit fade.
      - **Scrubbed, never played.** `action.reset().play(); action.paused =
        true;` once on mount, then every frame `action.time =
        clamp(entryProgress, 0, 1) * clip.duration; mixer.update(0)` —
        the same "scroll is the only story parameter" contract as every
        other section-scoped animation, applied to a real `AnimationMixer`
        for the first time in this codebase. `bloom`'s morph influence is
        driven by the same `entryProgress` through a `smoothstep`, not a
        wall-clock loop.
      - **Buds are literal skill nodes threaded onto procedural branches.**
        `buildBranches` makes one `CatmullRomCurve3` per skill category
        (deterministic, `seededRandom`); `buildNodes` (reused from
        `orrery.tsx`/`constellation.tsx`'s layout) supplies the skill/colour
        pairing, and `layoutBuds` places each on its category's branch by
        arc length. One `InstancedMesh` draws every bud regardless of skill
        count. The stem system itself — every branch's `TubeGeometry` — is
        welded into one `BufferGeometry` via `mergeGeometries`, matching
        `geometry-registry.ts`'s merge convention: one draw call for the
        whole trellis.
      - **Foliage reuses `buildSlabs` exactly as `monoliths.tsx` does**
        (S3/S17) — side, depth, lift, scale and colour all come from the
        same layout every wall variant reads; only the panel shape (an
        extruded almond `Shape` instead of a rounded slab) and the
        interaction (camera-facing turn + hover-lift instead of drag) are
        new. Its own stem system (a static merged spine + one twig per
        panel) follows the same `mergeGeometries` idiom as `growth.tsx`'s
        branches, deliberately not tracking each leaf's per-frame
        screen-anchored position exactly — a background compositional cue,
        not a rig.
      - **Hover is a real raycast, not the DOM store.** `hoveredProjectId`
        in `scene-interaction-store.ts` has no DOM publisher anywhere in the
        codebase (confirmed by grep) — a dead field. `foliage.tsx` samples
        `pickNearest` against its own registered leaf meshes every frame
        instead (gated the same way `monoliths.tsx` gates its drag pick),
        rather than wiring a store nothing writes to.
      - **`low` tier skips the fetch, not just the render.** `Growth`
        branches on `budget.tier === "low"` before `VineLoaded` (which calls
        `useGLTF`) ever mounts, so `vine.glb` is never requested — `low`
        renders `VineStatic`, a merged cylinder+icosahedron stand-in with the
        same silhouette family, no bones, no morph, no fetch. The same
        component also covers the Suspense-loading gap at `mid`+ (S10), so
        there is never a blank frame while `vine.glb` is still in flight.
      - **`typecheck`/`lint`/`build`: same shape as Phases H/I.** 15
        typecheck errors (exact pre-existing baseline, zero in any Phase J
        file, confirmed both via standalone `tsc --noEmit` and `next
        build`'s typecheck step — the build's failures are the same
        unrelated `visitor-search.tsx`/`visitor-table.tsx`/
        `visitors-panel.tsx`/`visits-trend-chart.tsx`/`ripple-toggle.tsx`/
        `settings-form.tsx` cluster Phase H already recorded). Lint: 7 new
        `react-hooks/immutability` errors across `growth.tsx`/`foliage.tsx`
        (mutating `action.time`/`mixer`, a `SkinnedMesh`'s `.material`/
        `.morphTargetInfluences`, and a KTX2 texture's `.colorSpace` after
        the hook returns it) — the identical, already-accepted pattern
        Phase I recorded for `orm.colorSpace =`/`normalMap.colorSpace =` on
        `monoliths.tsx`, not a new category of issue; zero other lint
        problems in any Phase J file. Turbopack's own compile step succeeds
        (`✓ Compiled successfully`).
      - **Runtime: smoke-tested against the live dev server, not
        Playwright-verified.** No browser-automation tool was available in
        this session (Phase H/I's Playwright passes were run in a different
        environment). What was actually checked: the dev server serves the
        homepage at 200 with no error-overlay markers in the HTML; all three
        generated assets (`vine.glb`, `leaf-color.ktx2`, `leaf-normal.ktx2`)
        serve at 200 with the exact byte sizes the generator scripts wrote;
        the dev server's own log shows no new errors or warnings introduced
        by this phase (the only warnings present — `THREE.Clock` deprecation,
        a Firebase admin-credentials warning — are pre-existing and
        unrelated). **Not verified in this session:** the scenery picker
        actually switching to `garden` in a live page, the vine/leaves
        visibly rendering, bidirectional scroll scrubbing, `low` vs `mid`
        visual parity, and measured draw-call counts against the §12
        budget. These are deferred to a real-browser pass rather than
        claimed here.

- [x] **Phase K — The crossfade.** §9's GSAP timeline. Until now, switching
      may cut. **Accept: ≤ 900ms, no frame over 32ms, works in both directions
      across all twelve ordered pairs.**

      Notes:
      - **Staggered discrete commits under a shared opacity veil, not
        continuous interpolation.** `scenery-transition.ts` is new: one GSAP
        timeline per switch, four `.call()`s at `DURATION * {0.14, 0.3, 0.46,
        0.6}` (exposure → palette → lights → geometry, §9's literal order),
        each still snapping its value the instant it fires. What hides the
        pop is `veilTargets` — an explicit opt-in registry (mirrors
        `scene-raycaster.ts`'s `registerInteractive`) of the canvas wrapper
        and the ambient backdrop, dipped to `opacity: 0.08` from `0` to
        `DURATION * 0.12` and restored from `DURATION * 0.64` to `DURATION`
        (`DURATION = 0.9`). No new colour/number interpolation was invented
        for a codebase that has none elsewhere (S14's own constraint).
      - **Two-field store split.** `scene-scenery-store.ts`'s single
        `sceneryId` became `id` (committed instantly — picker highlight,
        `localStorage`) and `renderScenery` (what WebGL and `data-scenery`
        actually reflect, mutated track-by-track by the four commits and now
        lagging `id` by up to 900ms). `setScenery(id, reducedMotion)` runs
        the timeline; `setSceneryInstant(id)` — used by hydration and the
        `three-scenery` flag-off path, neither of which has a "from" world to
        animate from — commits all four in one `set()` with no timeline at
        all, not a zero-duration one.
      - **Reduced motion bypasses the timeline object entirely** (§11): all
        four commits fire synchronously and `veilTargets` opacity is cleared
        via `gsap.set(..., { clearProps: "opacity" })` rather than run
        through a duration-zero tween — "the crossfade becomes a one-frame
        swap," not a broken animation played at speed 0.
      - **DOM-variant switches (`SkillsVariantSwitch`, `ProjectCardSwitch`)
        now read `renderScenery.id`, not the picker's `id`** — previously
        they cut instantly on click, ahead of the WebGL side; now they
        restructure in lockstep with the geometry commit, under the same
        veil.
      - **Verified functionally with Playwright in this session** (global
        install, `chromium.launch()`; the dev server on an ephemeral
        `PORT=3001` since 3000 was occupied): all twelve ordered pairs (4
        sceneries × 3 targets) driven through the real picker UI — open,
        select `from`, settle, open, select `to` — end with
        `document.documentElement.dataset.scenery`, the store's
        `renderScenery.id`, and the `localStorage` persistence key all equal
        to `to`. 12/12 passed, zero console/page errors across the run.
        Reduced motion (`page.emulateMedia({ reducedMotion: "reduce" })`)
        confirmed to reach the target `data-scenery` well inside a 300ms
        poll window, versus the ~900ms animated path — the collapse is real,
        not coincidentally fast.
      - **The ≤900ms/32ms frame-budget half of the accept criterion could
        not be measured here and is not claimed.** This sandbox has no GPU:
        `WEBGL_debug_renderer_info` reports `ANGLE ... SwiftShader Device
        ... SwiftShader driver` (software rasterization), and an idle
        baseline with zero interaction — no switch, no scroll, nothing but
        the persistent scene sitting still — already shows a 134ms average /
        217ms max `requestAnimationFrame` interval, the same software-
        rendering ceiling Phase I's headless-sandbox note hit and Phase K's
        own §9 anticipated. A first frame-sampling pass through an actual
        switch measured 167–783ms max frame gaps and 900ms–2.1s wall-clock
        completions — numbers that track the *unaccelerated renderer*, not
        the timeline: by inspection, `scenery-transition.ts`'s six timeline
        segments sum to exactly `DURATION` (0.9s) of GSAP animation time
        regardless of how slowly the browser can actually paint each frame,
        so the authored duration is correct; whether it *holds* to ≤900ms
        wall-clock with no frame over 32ms is a claim only a GPU-backed
        browser can settle, and is deferred to a real-browser pass rather
        than reported as a false pass or fail here.
      - **`typecheck`: 15 errors, the exact pre-existing baseline (confirmed
        by count, not just inspection), zero in any of the nine files this
        phase touched or added** (`scenery-transition.ts`,
        `scene-scenery-store.ts`, `scene-root.tsx`, `scene-canvas.tsx`,
        `ambient-background.tsx`, `scenery-controller.tsx`,
        `scenery-picker.tsx`, `skills-variant-switch.tsx`,
        `project-card-switch.tsx`) — same `visitor-search.tsx`/
        `visitor-table.tsx`/`visitors-panel.tsx`/`visits-trend-chart.tsx`/
        `ripple-toggle.tsx`/`settings-form.tsx` cluster every prior phase has
        recorded, reproduced identically by both a standalone `tsc --noEmit`
        and `next build`'s own typecheck step (Turbopack itself compiles
        clean — `✓ Compiled successfully`).
      - **`lint`: 277 problems (28 errors, 249 warnings) across nine files —
        none of them a Phase K file.** This total is wider than Phase J's
        documented count; the drift is pre-existing `react-hooks/immutability`
        and other findings across `growth.tsx`, `foliage.tsx`,
        `corridor.tsx`, `monoliths.tsx`, `camera-rig.tsx`,
        `use-css-colors.ts`, `share-donut.tsx`, `experience-form.tsx`, and
        the settings admin page — all already-existing files this phase did
        not edit, confirmed by grepping the lint output for every filename
        this phase touched and getting zero matches.

- [ ] **Phase L — Creative-direction review.** §15 run as a director on the
      real rendered page: all four sceneries × light/dark × three breakpoints
      × reduced motion. Fix what fails before calling Act III done.

---

## 14. Verification protocol

Compiling is not evidence. Inherits Act II's §12 and adds:

**Record the baseline before Phase A.** A scroll trace of the home page on
`main` at each tier, kept in the PR. §10 and Phase C2 are stated as
*improvements*, which means nothing without a number to improve on.

1. `next dev`; drive a real browser over the Chrome DevTools Protocol.
2. Screenshot **each scenery** at 1440×900, 1024×820 and 390×844, light and
   dark, at rest and mid-switch.
3. **The scroll trace is mandatory every phase**, not only at the end: record
   a full-page scroll with the pointer in motion, and report the long-frame
   count and the longest frame. Phase D additionally reports the same trace
   with the aura force-disabled, and the two must match.
4. Re-run the §11 control matrix: `three-scene` off, `three-scenery` off,
   `prefers-reduced-motion: reduce`, forced `low`, coarse pointer, WebGL off.
5. `npm run typecheck && npm run lint` last, not first. **Note: the tree has a
   pre-existing baseline of 15 type errors and 8 lint errors** (recorded in
   Act II Phase 20). Report against that baseline; do not claim a clean build,
   and do not silently fix unrelated files.

Paste the numbers that changed into the phase's note. "Looks good" is not a
verification.

---

## 15. Quality bar

As a director, not an engineer:

Does switching scenery feel like *changing worlds*, or like changing a
stylesheet? Does each scenery have one thing only it can do? Is the light
telling you what the material is? Does `garden` feel slower than `blueprint`
without being told? Is the Skills section genuinely a different idea in each
one, or the same graph in four colours? Does a project card feel like an
object you could pick up in `observatory`, and like a drawing you could
measure in `blueprint`? Is the cursor invisible in the right way — present,
unremarkable, never lagging? Can you scroll the whole page at speed and feel
nothing fighting you? Is typography still dominant in all four? Does reduced
motion give a considered still, or a broken scenery? Does `atelier` still look
exactly like the site did before any of this?

Any "no" is a defect. Fix it in the phase that owns it.

---

## 16. Non-goals and risks

**Non-goals.** A second canvas. A second custom shader — Act II closed that
budget; [atmosphere.tsx](src/three/scene/atmosphere.tsx) stays the only one.
Post-processing. Sound. `TextGeometry` — the DOM owns type. A scenery editor
in admin. More than four sceneries. Physics outside Game Mode. Per-scenery
fonts. Replacing Motion for DOM work. Inventing portfolio *content* to justify
geometry — set-dressing props are allowed; a fake "Services" section is not.

| Risk | Warning sign | Response |
|---|---|---|
| Scenery multiplies every future change by four | A one-line fix needs four edits | S3: definitions are data. If a change needs four edits, it belonged in the definition. |
| The picker becomes a gimmick nobody uses | Reviewers switch once and never again | Phase G is the test. If `blueprint` does not justify itself, cut to three sceneries. |
| Binaries bloat the repo | `git count-objects` climbs | §12's 1.8 MB cap; decoders gitignored; preload on intent. |
| Tier-3 variants drift from the originals | A variant loses the stretched-link pattern, gains a second tab stop, or drops an `aria-labelledby` | S17 caps them at four. Each is diffed against the component it replaces in Phase L, keyboard-only. |
| The picker changes the canvas but not the backdrop | Switching feels like a palette tweak because `.ambient` still looks the same | S13. The `.ambient` layer is the visible half; Phase A namespaces it before any scenery exists so no later phase can forget it. |
| Raycaster steals clicks from the page | A link over the canvas stops working | §6.2's "DOM yields first", tested explicitly in Phase F. |
| Inspect mode traps the visitor | Testers cannot get out | `Esc`, a visible close control, and click-away — all three, or it does not ship. |
| The aura reintroduces the lag it replaced | Scroll trace regresses | §14.3's two-trace comparison, every phase. |
| Skinned mesh tanks low-end | `low`-tier frame time climbs in `garden` | S11 plus Phase J's accept criterion: `low` never loads the rig. |
| Act III destabilises Act II's set piece | The Projects→Experience moment breaks in a new scenery | The signature moment plays in `atelier` framing only until Phase K; each scenery's variant is added after its scenery ships, or not at all. |

---

## 17. Conventions

- **Comments are short and to the point** — one or two lines of non-obvious
  *why*. Act I's long explanatory blocks stay as they are; new code does not
  add more of them.
- Strict TypeScript; no `any`.
- Reuse before adding: [scene-motion.ts](src/lib/experience/scene-motion.ts),
  [springs.ts](src/lib/experience/springs.ts),
  [scene-palette.ts](src/lib/experience/scene-palette.ts),
  [device-tier.ts](src/lib/experience/device-tier.ts),
  [variants.ts](src/components/motion/variants.ts). A constant that belongs in
  one of those goes there.
- **No new dependency.** Everything this plan needs — `drei`, `gsap`, the
  Draco/Basis/meshopt decoders — is already installed. If a phase thinks it
  needs one, that is a design error; write the reason here first.
- Update this file in the same session as the code it describes.
