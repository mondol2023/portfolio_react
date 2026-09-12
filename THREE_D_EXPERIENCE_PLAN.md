# Immersive 3D Studio — Delivery Plan & Prompt

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

This file is the single source of truth and working prompt for turning the
existing portfolio into one continuous, scroll-driven 3D creative space. It is
updated in place — every time a phase (or sub-task) is implemented, its
checkbox flips in the same session that does the work. Do not re-plan from
scratch in a future session; read this file first, resume at the first
unchecked box.

Sibling trackers, same convention, do not duplicate their scope here:
- [GAME_LAYER_PLAN.md](GAME_LAYER_PLAN.md) — the opt-in "Game Mode" floating
  world (`src/game`, `WorldLayer`, `GameHUD`). Stays exactly as-is. The
  cinematic scene below is a **different, always-available layer**: Game Mode
  is a playful toggle-on interaction the visitor opts into; this plan is the
  ambient identity of the site itself, on by default (subject to the existing
  animation/reduced-motion settings).
- [GAMIFICATION_PLAN.md](GAMIFICATION_PLAN.md) — scoring/collectibles on top
  of Game Mode. Unrelated to this work.

---

## 0. Codebase audit (done before any code was written)

### Stack already present — reuse, do not reinstall or replace
- **R3F stack**: `@react-three/fiber` 9, `@react-three/drei` 10, `three` 0.185,
  `@react-three/rapier` 2 (physics — used by Game Mode, not needed here).
- **Scroll/animation**: `gsap` 3.15 (ScrollTrigger available but not yet
  imported anywhere), `lenis` 1.3 (not yet wired to any layout), `motion`
  (Framer Motion) 13, `zustand` 5.
- No smooth-scroll provider currently wraps the site — introducing Lenis is
  additive, not a replacement of an existing scroll system.

### Existing DOM/motion architecture — extend, do not fork
- [components/motion/variants.ts](src/components/motion/variants.ts) —
  `EASE_OUT`, `DURATION`, `createFadeVariants`, `createStaggerVariants`,
  `VIEWPORT`. New 3D easing/timing constants must live next to these, sharing
  the same naming style, not a second ad-hoc timing system.
- [lib/experience/springs.ts](src/lib/experience/springs.ts) — named spring
  presets (`SPRING.*`). Card tilt / hover-toward-camera physics must reuse or
  extend this file, not invent new spring numbers inline.
- [components/motion/reveal.tsx](src/components/motion/reveal.tsx),
  [stagger.tsx](src/components/motion/stagger.tsx),
  [animated-text.tsx](src/components/motion/animated-text.tsx),
  [curtain.tsx](src/components/motion/curtain.tsx),
  [scroll-veil.tsx](src/components/motion/scroll-veil.tsx),
  [scroll-progress-line.tsx](src/components/motion/scroll-progress-line.tsx) —
  own all DOM entrance/exit and text motion. The 3D layer must never animate
  the same DOM element these already animate; it only owns the canvas.
- [components/sections/section.tsx](src/components/sections/section.tsx) +
  [ui/section-heading.tsx](src/components/ui/section-heading.tsx) — the shared
  section shell: anchor id, `aria-labelledby`, numbered eyebrow, and
  `data-tone` / `data-tone-anchor`.
- [lib/constants/section-tone.ts](src/lib/constants/section-tone.ts) — the
  **existing** per-section colour identity: `SECTION_TONES = ["hero", "about",
  "stack", "work", "experience", "contact"]`. This is already conceptually the
  "story parameter" the new spec asks for — the 3D scene's per-section colour,
  lighting mood and dominant object must be keyed off these exact tone names,
  not a new enum.
- [components/layout/ambient-background.tsx](src/components/layout/ambient-background.tsx) —
  the current 2D telling of "one continuous evolving world": an
  `IntersectionObserver` over `[data-tone-anchor]` elements resolves "the
  section under the reader's eyeline" and cross-fades CSS custom properties
  (`--tone`, `--tone-soft`) over ~900ms. **The 3D scroll-progress hook should
  read from the same observation mechanism** (or a shared hook extracted from
  it) rather than re-deriving current-section from scratch with a second
  observer.
- Public shell: [app/(site)/layout.tsx](<src/app/(site)/layout.tsx>) mounts
  `AmbientBackground`, then `children`, then the Game Mode layer
  (`GameProgressTracker`, `WorldLayer`, `GameHUD`) last. The new persistent
  cinematic `<Canvas>` mounts here too, between `AmbientBackground` and
  `children`, and must not be added to the root layout or `/admin`.
- Sections in scroll order today: `hero.tsx` → `about.tsx` → `skills.tsx` →
  `experience.tsx` → `projects.tsx` → `contact.tsx` (no separate
  services/capabilities section exists yet — treat "Services/Capabilities" in
  the spec below as optional/future, not a gap to invent content for).

### Existing accessibility/perf patterns — the contract to inherit, not duplicate
- [game/hooks/use-motion-preference.ts](src/game/hooks/use-motion-preference.ts) —
  `useSyncExternalStore` over `(prefers-reduced-motion: reduce)`, plus a
  non-hook `prefersReducedMotion()` for use inside frame loops. It is
  deliberately self-contained because `src/game` must not import host code.
  The new cinematic layer is host code (mounted in the public shell), so it
  should define **one** canonical `useMotionPreference` under the new
  directory (or promote a shared copy to `src/lib/hooks`) and have both
  `src/game` and the new layer's non-hook frame-loop check converge on intent
  even though the game layer keeps its own physically-isolated copy.
- Game Mode's own delivery plan already encodes the right defaults for any
  R3F layer in this codebase: lazy-loaded, canvas behind content and
  non-intercepting by default, respects reduced motion / device capability /
  tab visibility / WebGL failure. Follow the same defaults here.

### Admin animation control — current state, and the decision this plan makes
- [components/admin/animation-toggles.tsx](src/components/admin/animation-toggles.tsx)
  is a fully-built generic on/off-list component (`AnimationRow` /
  `AnimationSection`, optimistic toggle, calls
  `setAnimationEnabledAction(id, next)`) but **it is not currently imported by
  any admin page, and `@/lib/actions/animation-actions` does not exist yet** —
  it is wired for a feature that hasn't landed. This is the mechanism to
  finish and reuse for the 3D system's admin control, per spec §18 — not a
  second competing toggle.
- [components/admin/ripple-toggle.tsx](src/components/admin/ripple-toggle.tsx) +
  `@/lib/actions/ripple-actions` turned out **not** to be a working template —
  neither the action file nor `RippleToggle` itself is mounted or wired
  end-to-end anywhere in the app (confirmed by Phase 9). Left untouched as a
  separate, pre-existing, out-of-scope incomplete feature.
- Decision (Phase 9, revised): with no working ripple template to mirror,
  `animation-actions.ts` and its backing Firestore repository were built
  directly from the still-real `content-actions.ts` /
  `site-settings-repository.ts` singleton-doc pattern instead. Registers rows
  for exactly: `three-scene` (master on/off for the persistent canvas),
  `three-particles`, `three-camera-scroll`. `qualityLevel` /
  `particleIntensity` from spec §18 were not added — no real need showed up in
  Phase 8/10 perf testing.

---

## 1. Core creative direction (binding constraints, re-read before every phase)

One continuous creative digital space — "a developer portfolio inside an
interactive 3D exhibition" — not a Three.js demo, not a gaming site, not a
template. Sophisticated, minimal, cinematic, architectural, slightly
futuristic, professional. 3D supports content; it never competes with it.
Visual rhythm across the page: **calm → build → peak → release → calm**
(Hero: high impact · About: medium · Skills: interactive · Experience:
cinematic · Projects: HIGH IMPACT · Contact: calm). If everything is
spectacular, nothing is. One exceptional animation beats ten mediocre ones.

Explicitly avoid ("no AI slop"): random floating cubes, generic glowing
purple blobs, excessive neon/bloom/blur/gradients, infinite particles,
everything spinning or floating at once, identical animations copy-pasted
across every card, 3D added for its own sake. Every object and animation must
justify itself via hierarchy, interaction, transition, depth, or storytelling.

## 2. Technology architecture

- R3F + Drei for all actual 3D (objects, camera, lighting, particles).
- GSAP + ScrollTrigger only for scroll-driven scene choreography (camera
  timelines, pinned cinematic sections, multi-object sequences) — not for
  ordinary DOM motion, which stays on `motion`.
- Motion stays owner of DOM entrance/text/buttons/menus/modals/micro-interactions.
- CSS stays owner of simple hover/focus where it's sufficient.
- Never animate the same property from two systems at once.
- Lenis (already installed) wraps the scroll if smooth scroll is introduced;
  GSAP ScrollTrigger syncs to it, it does not run a second competing raf loop.
- One persistent `<Canvas>` for the whole journey — not one per section —
  containing multiple section-scoped object groups shown/hidden/transitioned
  by scroll progress. Fixed/sticky, behind or alongside DOM content, synced to
  scroll via the shared progress source (see §0's `AmbientBackground` note).

## 3–6. The one scene, the hero, the environment, per-section identity

Scroll position is the story parameter. Objects move/rotate/scale/morph/fade/
change material/travel/transform between sections — no abrupt resets. Hero
gets one sophisticated central object (not a generic cube): rounded geometry,
bevels, glass/metal contrast, controlled lighting; idle rotation ~8–20s per
revolution, ≤3–6° mouse parallax (damped), 30–90° scroll-driven rotation.
Global environment stays sparse: 1 primary focal object + 2–5 secondary
elements + subtle background detail, three depth layers (foreground/midground/
background), aggressive negative space. Each section gets its own identity —
About (fragmentation/reorganization), Skills (node/constellation graph keyed to
the real tech list), Experience (spatial timeline the camera travels through),
Projects (dimensional cards, the show-stopper section), Contact (the scene
goes calmer/darker/quieter — "the journey is ending"). Full per-section detail
is in the original brief; consult it again at the start of each of Phases 2–7
below rather than re-deriving from memory.

## 7–17. Cards, lighting, materials, colour, scroll choreography, timing, camera, particles

- Cards: subtle depth (glass surface → content → highlight → shadow layering),
  hover response 150–350ms / return 300–600ms, spring-damped, rotateX ≈
  ±4°, rotateY ≈ ±6°, never instant-snap. Simple cards use CSS perspective;
  reach for real R3F only where it adds real value (Projects).
- Lighting: one coherent global rig (soft key + weak fill + rim/back light,
  optional section accent points), realistic soft falloff, no harsh white,
  no rainbow/nightclub colour cycling. Tone shifts gently per section using
  the existing `SECTION_TONES` values, not a new palette.
- Materials: mix, don't uniform-ify — roughly 70% matte/neutral, 20% metallic,
  10% glass/emissive accent.
- Colour: derive from the existing theme tokens and `section-tone.ts` values;
  one primary accent, at most one secondary, used sparingly. No unrelated
  palette, no default neon.
- Scroll choreography: scroll **progress**, not raw scroll listeners; scrub
  0.6–1.2s for cinematic camera/object work, shorter smoothing for UI, longer
  for scene transitions; pin only sections whose animation truly requires it.
- Timing budget: micro 120–250ms, hover 250–450ms, card entrance 500–900ms,
  3D object transition 800–1600ms, major scene transition 1200–2400ms, camera
  move 1000–2200ms, ambient loops 8–30s. Calm and confident, never rushed.
- Camera: one perspective camera, FOV ~40–55°, smooth interpolation, no
  shake, no roller-coaster zoom.
- Particles: 50–300 desktop, far fewer on mobile, slow drift, subtle
  depth/mouse response, never dominant.

## 18–26. Admin integration, accessibility, responsiveness, performance, fallback, assets, typography

- Admin animation switch is the single source of truth (see §0 decision
  above). When off: no idle rotation, no particle system, no mouse parallax,
  no scroll-driven 3D, static-but-worthwhile scene or lightweight fallback.
- `prefers-reduced-motion`: no camera movement, no continuous rotation, no
  particles, no big scroll choreography; content stays fully usable; the 3D
  layer is enhancement only — nothing meaningful lives exclusively in WebGL.
- Responsive: desktop full experience; tablet reduced complexity; mobile is a
  **deliberate** composition (one main object + one or two environment
  elements), not a scaled-down desktop scene; touch never emulates desktop
  mouse parallax.
- Performance is first-class: dynamic-import the whole 3D layer behind
  Suspense, adaptive DPR, geometry/material reuse, instancing where it
  applies, minimal draw calls/lights/post-processing, pause work when the
  canvas is off-screen or the tab is hidden, progressively degrade
  (particles → DPR → post-processing → object count → shadows) if FPS drops.
- WebGL failure always falls back gracefully (CSS/Motion/static), never
  breaks the site.
- Any external 3D assets are GLTF/GLB, original or properly licensed, loaded
  behind Suspense with a loader that matches the site's visual identity (no
  generic spinner).
- Typography stays in the DOM for accessibility/SEO; 3D frames it, never
  occludes or replaces it.

## 27. Suggested code layout

```
src/three/                       (new — sibling to src/game, not inside it)
  scene/
    scene-root.tsx                the persistent <Canvas>, mounted once in (site)/layout.tsx
    camera-rig.tsx
    lighting.tsx
    environment.tsx
    particle-field.tsx
  objects/
    floating-sphere.tsx  glass-orb.tsx  floating-ring.tsx
    crystal.tsx  node-cluster.tsx  architectural-frame.tsx
  sections/
    hero-scene.tsx  about-scene.tsx  skills-scene.tsx
    experience-scene.tsx  projects-scene.tsx  contact-scene.tsx
  materials/
  hooks/
    use-scene-progress.ts   (reads the same section-under-eyeline signal as ambient-background.tsx)
    use-pointer.ts
    use-adaptive-quality.ts
    use-motion-preference.ts (host copy; game keeps its own isolated one)
```
Deviate from this only where the existing project already has a clearly
better pattern for that piece (e.g. reuse `springs.ts` instead of a new spring
file). Strict TypeScript, no `any`.

## 28. Implementation phases

- [x] **Phase 0 — Audit.** Existing structure, animation architecture, admin
      animation setting, all major sections, theme tokens, Card components,
      scroll implementation, Lenis/GSAP presence, performance-sensitive
      components. (Findings above in §0.)
- [x] **Phase 1 — Global 3D scene foundation.** `src/three/scene/scene-root.tsx`
      mounted in `(site)/layout.tsx`; camera rig, base lighting, environment
      shell, dynamic import + Suspense + WebGL-failure fallback; wired to a
      (temporary, hard-coded-on) enabled flag ahead of real admin wiring.
      Also wired: `use-scene-progress.ts` (shared eyeline signal with
      `AmbientBackground`) and `scene-content-store.ts` +
      `three/bridge/scene-data-bridge.tsx` (real Skills/Experience/Projects
      data reaching the persistent canvas from their server-rendered sections).
- [x] **Phase 2 — Hero.** `three/objects/hero-sculpture.tsx` (glass sphere +
      fixed-tilt metal ring, no env-map/transmission — cheap on a transparent
      canvas) mounted via `three/sections/hero-scene.tsx`; idle rotation
      (~14s/revolution) + breathing scale, damped ≤5° mouse parallax via a
      canvas-level shared `usePointer()`, and 60° scroll-driven rotation into
      About. `camera-rig.tsx` now exports `sceneSectionProgress()` so every
      later section-scene can derive its own local 0–1 scroll progress from
      the one shared `progress` value instead of re-deriving the path.
- [x] **Phase 3 — About.** `three/objects/about-fragments.tsx` — seven seeded
      tetrahedron shards (alternating matte/metal, continuing Hero's
      glass/metal contrast) that scatter outward from where the Hero sphere
      sat and reorganize into a shallow arc as the camera arrives, then
      condense away (scale to 0, not re-scatter) as it moves on to Skills;
      mounted via `three/sections/about-scene.tsx`. Hero's sculpture now takes
      a matching `exitProgress` and fades its own scale out across the same
      About → Skills span, so the hand-off between the two sections reads as
      one continuous transformation rather than a cut.
- [x] **Phase 4 — Skills.** `three/objects/skill-galaxy.tsx` — one node per
      real `Skill` (via `scene-content-store`, capped at `budget.galaxyNodes`),
      chained into per-category constellations; nodes scatter as a raw galaxy
      at rest and gently reorganize into loose category clusters as the
      camera arrives, then recede (scale fade, same contract as Hero/About) on
      the way to Experience. Hover glow + name label follows the shared
      `usePointer()` position projected to screen space each frame (skipped
      entirely under reduced motion, matching the parallax contract
      elsewhere); mounted via `three/sections/skills-scene.tsx`.
- [x] **Phase 5 — Experience.** `three/objects/experience-timeline.tsx` — one
      octahedron marker per real `Experience` (via `scene-content-store`,
      ordered and colored by `EmploymentType`), strung along a gently
      wandering rail connected by a faint line. Rather than moving the shared
      camera (only `CameraRig`'s 6-waypoint path does that), the rail itself
      glides forward along +Z as the section is entered and keeps gliding —
      never reversing — as it's left, so the whole span reads as one
      continuous "travel through the timeline." The current role's marker
      breathes emissive intensity as the one ambient cue layered on top of
      the shared entry/exit scale-fade every prior section already uses;
      mounted via `three/sections/experience-scene.tsx`.
- [x] **Phase 6 — Projects/cards.** `three/objects/project-panels.tsx` — real
      `Project` data (via `scene-content-store`, already capped upstream to
      the DOM's home-page limit) becomes a fanned deck of dimensional glass
      panels, each with the layered depth §7 asks for: dark shadow backing →
      translucent glass slab (`meshPhysicalMaterial` transmission/clearcoat)
      → emissive top rim, brighter/thicker on the lead project's panel to
      echo the DOM grid's own emphasis treatment, plus a small marker on any
      `featured` project. Panels arrive with a depth-staggered entrance —
      each one lagging further behind the last, sliding forward out of the
      dark rather than popping in together — then the whole deck recedes
      (scale fade, same contract as every earlier section) toward Contact.
      The one true real-R3F interaction the spec calls for here: the whole
      deck tilts toward the shared pointer through an actual damped-spring
      integrator reusing `SPRING.panel`'s stiffness/damping/mass (not just a
      lerp), capped at ±4°/±6°, so it settles with a touch of genuine
      overshoot; skipped entirely under reduced motion. Mounted via
      `three/sections/projects-scene.tsx`.
- [x] **Phase 7 — Contact.** `three/objects/contact-calm.tsx` — the one
      Platonic-solid family no earlier section used (a dodecahedron), turning
      at roughly a quarter of Hero's rotation speed with a barely-there
      breathing scale, no mouse parallax and no hover — the site's energy
      winding all the way down rather than one more reactive object. Rather
      than touching the shared `lighting.tsx` rig, "darker" is a large
      `BackSide` shell (colour derived from `toneSoft`, darkened, never a
      hardcoded neutral) fading in behind it as the section is entered,
      self-contained to this section like every other phase's fade. Contact
      is the camera path's last waypoint, so — unlike every earlier
      section-scene — there is no exit span: the object settles in via
      `entryProgress` and stays, matching "the journey is ending." Mounted
      via `three/sections/contact-scene.tsx`.
- [x] **Phase 8 — Responsive optimization.** Adaptive DPR/quality
      (`budget.maxDpr`, `.segments`, `.particles`, `.galaxyNodes`) was already
      threaded through every section from Phase 1 onward; this phase closed
      the three remaining gaps. (1) **Deliberate mobile composition, not a
      scaled-down desktop scene**: `about-fragments.tsx` now takes `budget`
      and thins its shard count from seven to four on the `low` tier, the
      concrete example the spec itself gives, rather than rendering the same
      seven shards smaller. (2) **Tablet complexity reduction**:
      `device-tier.ts`'s `classify()` now caps any coarse-pointer device
      under 1024px width at `mid` before its `high` checks run — a modern
      tablet's reported cores/memory routinely qualify for `high` on specs
      alone, which the spec explicitly says a tablet should not get. (3)
      **Touch never emulates desktop mouse parallax**: `use-pointer.ts` now
      ignores `pointerType === "touch"` moves outright, so Hero's parallax,
      Skills' hover glow, and Projects' cursor-tilt all settle to their
      neutral resting pose on touch devices instead of freezing wherever a
      touch drag last landed.
- [x] **Phase 9 — Admin integration.** `ripple-actions.ts` turned out not to
      exist (neither it nor `animation-actions.ts` was ever built, and neither
      `RippleToggle` nor `AnimationToggles` was mounted anywhere) — Phase 9
      built the Firestore-backed path from scratch, mirroring
      `site-settings-repository.ts`/`content-actions.ts`'s existing singleton-
      doc pattern instead. New: `lib/types/content.ts`'s `AnimationSettings`
      (`{ enabled: string[] }`) and `ANIMATION_IDS` constant;
      `DEFAULT_ANIMATION_SETTINGS` in `constants/defaults.ts` (all three on,
      matching pre-Phase-9 behaviour); a `content/animationSettings` doc via a
      new `CONTENT_DOCS` key; `firebase/repositories/animation-settings-
      repository.ts` (`getAnimationSettings()` cache()-wrapped with the same
      missing-doc-falls-back-to-default contract, `setAnimationEnabled(id,
      next)` reads-then-overwrites the full set rather than
      `arrayUnion`/`arrayRemove`, since removing from a not-yet-created
      document couldn't be told apart from an admin's intentional empty set);
      `lib/actions/animation-actions.ts`'s `setAnimationEnabledAction`
      (`withAdmin` + `revalidateAnimationSettings` — new in
      `revalidation.ts` — + `actionSuccess`, no Zod schema needed for a plain
      id/boolean pair). `AnimationToggles` is now mounted on
      `/admin/settings` with one group ("3D experience": `three-scene`,
      `three-particles`, `three-camera-scroll`). The resolved settings are
      read server-side in `(site)/layout.tsx` and passed to `SceneRoot` as
      `enabledAnimations`, replacing the Phase-1–8 placeholder
      `THREE_SCENE_ENABLED` constant outright. `three-particles` zeroes only
      `SceneEnvironment`'s dust-field budget (`scene-canvas.tsx` passes it a
      `{ ...budget, particles: 0 }` copy — every other section's budget is
      untouched); `three-camera-scroll` freezes `CameraRig` at the Hero
      waypoint by feeding it a pinned `progress = 0` while every section-scene
      still reads the real scroll `progress` for its own entry/exit fade — so
      turning the dolly off does not also freeze section choreography.
- [x] **Phase 10 — Performance & accessibility audit.** Audited against the
      full checklist below before writing new code, to find the real gap
      rather than assume a blank slate: `prefers-reduced-motion`
      (`use-motion-preference.ts` → `useSceneBudget`'s `stillBudget()`),
      tab-hidden/off-screen pause (`use-scene-active.ts`'s
      `IntersectionObserver` + `visibilitychange` → `frameloop="never"`), and
      WebGL-failure fallback (`SceneErrorBoundary` in `scene-root.tsx`) were
      all already in place from Phases 1–8. The one genuinely missing piece
      was FPS-based degradation — `classify()` (`device-tier.ts`) only ever
      produces a single static, pre-first-frame guess from `deviceMemory`/
      `hardwareConcurrency`/pointer/width, and never corrects itself once the
      scene is actually running. Added `stepDownTier(tier)` (`high→mid→low`,
      one notch, `low` has nowhere further to go) and a new
      `three/scene/fps-monitor.tsx`: a `useFrame`-based, render-nothing
      component that samples a rolling 90-frame window, and — only if more
      than 60% of frames in a full window ran below 40fps — fires a one-shot
      `onSustainedDrop()` for the rest of the session (a ref guard prevents
      re-arming; a rolling-window majority threshold, not a single slow
      frame, so one GC pause or asset decode can't trigger it). Wired into
      `scene-canvas.tsx`: a `runtimeTier` state (initially `null`) resolves an
      `effectiveBudget` (`runtimeTier ? budgetFor(runtimeTier) : budget`) that
      now feeds `SceneLighting`, `HeroScene`, `AboutScene`, `SkillsScene`,
      `Canvas`'s own `dpr`/`shadows`, and (composed with the Phase 9
      particles-gate) `SceneEnvironment` — every consumer of the hardware
      guess reads the runtime-corrected value once it fires. `FpsMonitor` is
      only mounted `enabled={active && !reducedMotion}`: an inactive canvas
      isn't ticking at all, and reduced motion already renders "demand"
      (sparse, near-meaningless per-frame deltas), so neither would give the
      monitor a real signal.

      Full §29 review: **one world / each section different / smooth
      transitions** — yes, one persistent `<Canvas>` with per-section groups
      sharing the same tone/progress/pointer inputs (Phases 2–8), nothing
      remounts between sections. **Too much motion / moments of calm** — the
      camera rig eases between fixed waypoints rather than continuously
      drifting, and reduced motion collapses to a still frame site-wide.
      **3D supports content, cards feel physical, memorable hero, intentional
      scroll** — carried by Phases 2–7's per-section design, unchanged here.
      **Stays fast / mobile usable** — `device-tier.ts`'s tier budgets
      (now runtime-correctable) and `use-pointer.ts`'s touch-ignores-parallax
      rule (Phase 8) cover this; a full Lighthouse pass needs a real
      browser/display this environment doesn't have, so `next build`'s
      Turbopack compile step (succeeded, 18.5s) is the practical proxy
      available here — it exercises the same `next/dynamic({ ssr: false })`
      code-splitting boundary (`scene-root.tsx`) that keeps `three`/
      `@react-three/fiber` out of the first-load bundle. The build's separate
      TypeScript-check step still fails, but only on the same 16 pre-existing
      errors confirmed unrelated and out of scope in Phase 9 (analytics
      dashboard components, `ripple-toggle.tsx`, `settings-form.tsx`'s
      `phone` field) — `tsc --noEmit` re-run after this phase's edits
      reproduces exactly that same set, zero new. **Disabling animation
      disables expensive work / reduced-motion correct / WebGL fallback** —
      Phase 9's narrow-scope gates plus the mechanisms audited above.
      **Professional without 3D** — `SceneErrorBoundary` and the
      `three-scene` master switch both fall back to the plain DOM site with
      nothing missing.

- [x] **Phase 11 — Projects-first refinement pass: colour bridge, lens, dwell,
      and the gallery corridor.** A focused pass taking the Projects scene as
      the anchor and lifting animation, interaction, design, lighting and
      camera framing around it. Two pre-existing defects surfaced first, and
      both are fixed at the root rather than worked around.

      **Defect 1 — the colour bridge was collapsing.** `use-css-colors.ts`'s
      `normalise()` matches `rgba?(...)` but destructures only `[r, g, b]`, so
      `--tone-soft`'s alpha (`rgba(190,18,60,0.12)`) was silently dropped and
      `toneSoft` resolved to the *same saturated hex* as `tone`. Fog, ambient
      light and fill light were therefore all being fed a full-strength accent
      — the reason the scene read as a single tinted wash rather than a lit
      space. Rather than teach the shared hook about alpha (its DOM-side
      callers rely on the current behaviour), `scene-root.tsx` now reads
      `["--tone", "--bg"]` and a new
      [lib/experience/scene-palette.ts](src/lib/experience/scene-palette.ts)
      derives the whole scene palette from those two honest values:
      `buildScenePalette(tone, background)` → `{ accent, wash, atmosphere,
      key, fill, surface, deep, dark }`, with light/dark inferred from the
      page's own luminance instead of a second theme subscription. It imports
      nothing from `three` on purpose — `scene-root.tsx` is *not* code-split,
      so a `THREE.Color` there would pull the whole library into the
      first-load bundle and undo Phase 1's boundary. `buildScenePalette` is
      called inside `scene-canvas.tsx` (the split side) and memoised on
      `[tone, background]`, since `progress` re-renders that component on
      every scroll event.

      **Defect 2 — `transmission` with nothing to transmit.** The old project
      panels used `meshPhysicalMaterial` + `transmission`, which forces three
      into an extra full render of the scene *per panel per frame*, and with
      no environment map mounted there was nothing for it to refract. Five
      panels meant five hidden extra passes for an effect that could not be
      seen. Removed outright; everything in the corridor is
      `meshStandardMaterial` now.

      **New shared vocabulary.** Frame-loop motion is a third case alongside
      DOM `variants.ts` (declarative) and `springs.ts` (spring constants), so
      [lib/experience/scene-motion.ts](src/lib/experience/scene-motion.ts)
      names it once instead of letting each object re-derive it: a
      `SCENE_SMOOTHING` scale (`snap` → `cinematic`), frame-rate-independent
      `damp()`/`dampFactor()` (`1 - pow(smoothing, delta)`), a real
      damped-spring integrator `springStep()` that reuses the existing named
      `SPRING` constants rather than inventing a second set, the three eases
      the scene actually uses, and `stagger()` for index-offset waves.
      [three/scene/geometry.ts](src/three/scene/geometry.ts) adds
      `roundedSlabGeometry()` (bevelled extrude — a slab with a hard 90°
      silhouette edge cannot catch a highlight, which is most of why the old
      panels read as flat rectangles) and a module-cached `glowTexture()`.

      **Camera: a lens, and a middle.** `Waypoint` now carries `fov`, lerped
      along the path and damped per frame (projection matrix rebuilt only past
      a 0.01° delta). The lens tightens to 43° at Projects, where the corridor
      wants compression, and opens to 51° at Contact, where the scene lets go
      — inside the spec's 40–55° band, and slow enough across a whole section
      to read as mood, never as a zoom. Span interpolation is eased
      (`easeInOutSine`) instead of linear, so the camera arrives and departs
      rather than conveyor-belting. Pointer parallax now rides *on top of* the
      path (damped, decaying to centre on pointer-leave) with the lookAt
      target counter-rotating at 0.25×, so the cursor swings the camera around
      the subject instead of panning off it. New `sceneSectionEnvelope(
      progress, index)` fixes a structural problem in the old scroll mapping:
      read straight off the path, a section's entrance completed at the exact
      instant its exit began, so no section was ever simply *there*. Entrances
      now finish inside the first 72% of their span and exits hold until 28%
      into the next, buying every section a plateau — the "moments of calm"
      half of `calm → build → peak → release → calm`. `about`, `skills`,
      `experience`, `projects` and `contact` scenes all read the envelope;
      `hero-scene.tsx` keeps raw `sceneSectionProgress` for its rotation (its
      sculpture deliberately lives one span longer) but takes its exit from
      the envelope.

      **Lighting.** Rebuilt around the palette as a three-point rig plus a
      rim: ambient from `palette.wash` (0.22 dark / 0.58 light — light themes
      need the lift, dark themes need the restraint), a key directional in
      `palette.key` (a warm near-white, not the accent) that owns the shadow
      map at 2048² with a bounded ortho frustum, a cool `palette.fill`
      opposite it at roughly a fifth of key, and an accent rim from behind to
      separate geometry from the fog. Shadow casting stays gated on
      `budget.shadows`.

      **Environment.** Fog now fades toward `palette.atmosphere` (the real
      page background) rather than the accent, so depth reads as distance
      instead of tint. The dust field, previously static, drifts on
      `clock.elapsedTime` with an independent slow size swell, sits in a
      flattened `sphericalCloud`, and switches blending mode by theme —
      additive on dark, normal on light, where additive would only wash out.

      **Projects — the gallery corridor.** The old composition was a centred
      fan, which was invisible in practice: `container-page` is 76rem wide and
      `ProjectCard` is opaque `bg-surface`, so the whole deck sat behind the
      card grid. The corridor instead lives in the page's side gutters and on
      the depth axis, framing the content rather than fighting it. The same
      project the DOM grid gives `emphasis` becomes a lead monolith at the
      vanishing point; the rest mount alternating left/right walls that flare
      outward and recede in depth. The authored moment: panels rest **flush
      with their wall**, edge-on, showing only an emissive leading edge, and
      swing open toward the camera in a near-to-far wave as the section
      arrives (`stagger`, 0.55 overlap); leaving swings them shut while the
      corridor keeps gliding, so the exit is a gesture rather than a fade.
      Hover is screen-space — the canvas is `pointer-events-none` at
      `z-index:-8` and can never raycast, so each panel projects its own world
      position to NDC and compares against the shared pointer, the idiom
      `skill-galaxy.tsx` established — driving lift along local +Z, extra yaw
      and emissive gain, each damped independently. Whole-corridor sway runs
      through `springStep` on the existing `SPRING.panel`. Panel colour now
      varies only in lightness and chroma inside the accent hue; the previous
      `hashString(project.type)` hue rotation was a direct violation of the
      "no rainbow, no nightclub colour cycling" rule above and is gone. All
      six geometries are built once in a `useMemo`, shared via `geometry={}`
      with `dispose={null}`, and disposed explicitly on unmount. A
      section-local point light travels with the corridor, and an additive
      sprite behind the monolith stands in for bloom — this plan forbids
      adding a dependency for an effect the stack can already express, and a
      postprocessing pass for one glow is exactly that. Panel count is
      tier-capped (2 / 3 / 6) and the whole root early-outs to
      `visible = false` outside its envelope.

      Reduced motion keeps its contract throughout: no pointer response, no
      continuous drift, and every element still lands in its final open pose.
      Verification: `next build` compiles successfully (8.9s, Turbopack);
      `tsc --noEmit` reproduces exactly the same 16 pre-existing errors
      documented in Phases 9–10 and no new ones; the Impeccable mechanical
      detector, run once over all ten changed/added files, reports zero
      findings.

- [x] **Phase 12 — Cinematic corridor polish: composition measured from the
      rendered page.** Phase 11 built the corridor correctly and aimed it
      wrongly. Inspected first in a real browser over the Chrome DevTools
      Protocol at 1440×900, 1024×820 and 390×844 before a single number
      was touched, and the screenshots settled the argument: at the plateau
      exactly *one* panel was visible — a crimson rectangle clipped behind
      the left project card — and the lead monolith was entirely hidden
      behind the opaque card grid. The only empty pixels on the page were
      the two side gutters, measured at 112 | 1216 | 112 at 1440 and zero at
      1024 and below.

      **Panels are now placed in screen fractions, not world units.** A slab
      at a fixed world x sweeps sideways whenever the camera dollies or the
      lens changes, which is why panels were landing under the cards. Each
      frame the corridor reads the live camera — `halfH = tan(fov/2)·depth`,
      `halfW = halfH·aspect` — and places every slab at a *fraction* of the
      frame half-width, so it holds its column in the page's gutter at any
      viewport and any focal length, and the z-dolly reads as the panel
      growing rather than drifting. The content-safe fraction is derived from
      the real layout constants (`CONTENT_MAX_PX = 1216`, the 76rem container;
      `CONTENT_PAD_PX = 40`, capped at 5vw), giving 0.789 at 1440 and ~0.92 at
      1024 — the 3D can never overlap the text column because it is told
      where the text column is.

      **The vanishing point is vertical.** A 152px gutter has no room for
      horizontal convergence, so depth is carried by four cues stacked
      together: the rake toward the eyeline (`lift = LIFT_NEAR ·
      LIFT_FALLOFF^i` → 0.34 / 0.21 / 0.13), shrinking scale, opacity
      falling off with distance (`FAR_DIM`), and a per-slab lightness ramp
      that walks the near slab dark and the far ones pale so they meet the
      fog instead of ending at it. Hue is fixed across the whole rake — the
      no-rainbow rule holds; only lightness and chroma move.

      **The lead project became the end of the corridor.** Anything opaque
      behind the Projects heading or standfirst destroys dark-text-on-light
      contrast, so the monolith is no longer a centred slab. It is a broad
      low end wall — wider than the frame (`PORTAL_FRAC 1.1`), seated below
      the eyeline — built from two unit planes scaled per frame, a mass and
      an accent plate grown by a fixed world margin so the lit border stays
      an even line at every distance. Centrally it sits under the card grid;
      in the gutters its lit top edge crosses the frame as the one horizontal
      the composition leads to, and during entrance and exit, before the
      cards arrive, it is fully visible. It approaches on entry and recedes
      on exit rather than fading out.

      **Entrance is four beats read off the shared ramp**, via a local
      `phase(t, from, to)` helper (not a duplicate of `scene-motion` — it
      slices the ramp that file already produces): corridor depth resolves
      (0→0.62), the end wall establishes the focal point (0.16→0.74),
      side panels open near-to-far through the existing `stagger()`
      (0.3→1), then lighting and idle life settle (0.55→1) into a plateau
      where nothing initiates. Exit reverses the same spatial logic with the
      same stagger, shortened to `EXIT_SPAN = 0.3` because the shared
      envelope would otherwise leave panels standing over Experience's first
      screen — the corridor is left behind, not switched off.

      Camera: the waypoint system is untouched. Projects' waypoint lifts its
      eyeline under 1.5° (`lookAt` y 0.02 → 0.16, position y 0.12 → 0.06) so
      the end wall's lit edge lands where the eye already is; the 43° lens
      stays. Fog tightened to 7.5–25 so the near slab is untouched, mid slabs
      lose a third to page colour and the end wall arrives half dissolved.
      Lighting: light-theme fill 0.24 → 0.3 and rim 0.5 → 0.64, because a dark
      slab on a near-white page without a rim is a hole rather than a
      surface. Idle life after settle is a sub-degree breath (0.7°) and a 5%
      light pulse — present at twenty seconds, invisible as animation.

      Responsive behaviour is one number, not a second architecture:
      `allowance` is a smoothstep over the measured gutter width (70→150px),
      so 1440 gets the full rake, 1024 collapses it to nothing and the walls
      stop drawing entirely, and mobile never builds them. Tier caps and
      reduced-motion contracts are unchanged.

      Verification: `next build` compiles successfully (2.4 min, Turbopack)
      and then fails its type-check step on the same 16 pre-existing errors
      documented in Phases 9–11 — all in admin/analytics components that
      import modules absent from the repo, none touched on this branch;
      `tsc --noEmit` reproduces exactly those 16 and nothing under
      `src/three/`. `npm run lint` reports 10 errors and 1 warning, all
      pre-existing: the React Compiler's `react-hooks/refs` and
      `react-hooks/immutability` rules fire on the r3f `useFrame` idiom
      throughout (`skill-galaxy.tsx`, untouched, trips the identical pair;
      the committed `project-panels.tsx` already tripped the same rule at
      lines 114–115), plus four unrelated DOM-side findings. Phase 12 adds
      no new lint violation, no dependency, no post-processing and no second
      rendering path.

## 29. Quality bar — run this checklist at the end of Phase 10

Does the site feel like one world? Does each section feel different? Are
transitions smooth? Is there too much motion? Are there moments of calm? Does
3D support the content? Do cards feel physical? Does the hero create a
memorable first impression? Does scrolling feel intentional? Does the website
remain fast? Does mobile remain usable? Does disabling animation actually
disable expensive work? Does reduced-motion work correctly? Does WebGL
failure have a fallback? Does the site still feel professional without 3D?
Fix anything that fails these before calling Phase 10 done.

## 30. Target feeling

"An interactive digital studio built around one continuous 3D environment" —
not "a normal portfolio with some Three.js added." Build for delight, not for
effect count.
