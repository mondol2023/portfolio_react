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
