@AGENTS.md

# Codebase reference (hand-maintained)

Cheat-sheet of files already read in depth, so future sessions don't have to
re-discover them from scratch. Update this file when you read a new important
file in full, or when one of these signatures changes. Keep entries terse —
signature + gotcha, not prose.

See also `game1.md` for the gamified-portfolio plan (Pass 1/2/3 checklists,
"Shared foundation" table, "Known issues").

## Page architecture

- `src/app/(site)/page.tsx` — `HomePage` composes
  `<DesktopPanes><Hero/><About/><Skills/><Projects/><Experience/><Contact/></DesktopPanes>`.
  Fetches data server-side with `Promise.all`, `export const revalidate = 300`.
- `src/components/desktop/desktop-panes.tsx` — wraps each top-level child in
  `<div data-pane className="flex min-h-dvh w-full snap-start flex-col justify-center pb-14">`.
  **Every home section is its own full-viewport snap pane.** `min-h-dvh` (not
  fixed height) lets a section grow taller than the viewport. `pb-14` reserves
  space for a fixed taskbar. New section content should read well as "one
  screen" but may scroll taller within its own pane.
- `src/components/sections/section.tsx` — `Section({id, children, className, labelled=true, tone, exit=true, variant})`,
  `headingId(sectionId)`. Wraps children in `ScrollVeil`, picking the veil `variant` from
  `TONE_VARIANTS` (hero→fade, about→rise, stack→expand, work→tilt, experience→settle,
  contact→zoom) unless one is passed explicitly. The long-unexplained unused `BombIntro`
  import was removed in Pass 4 (it was an eslint warning and never rendered).
- **`ScrollVeil` gotcha — `position: fixed` does not work inside a `Section`.**
  `src/components/motion/scroll-veil.tsx` binds `opacity` + `y` + `scale` + `rotateX` from
  the first post-hydration render, and a transformed ancestor becomes the containing block for
  `fixed` descendants (and its own stacking context, so their `z-index` only ranks
  against siblings). Any overlay rendered from inside a section must either portal to
  `document.body` (as `ExpandedCartridge` does) or use `<dialog>.showModal()`, which
  escapes to the top layer (as `Dialog`/`RoleScene` do). Reduced motion skips the
  transform, so the bug is invisible in exactly the mode you would test it in.
- `src/lib/constants/section-tone.ts` — `SECTION_TONES = ["hero","about","stack","work","experience","contact"]`,
  `SectionTone`, `DEFAULT_TONE`, `isSectionTone`. Tone applied via `data-tone="…"` on `<Section tone>`.
- `src/app/globals.css` (~L120-209) — tone hex values, `@theme inline` mapping. Confirmed:
  - `work`: light `#be123c` / soft `rgba(190,18,60,0.12)`; dark `#fb7185` / soft `rgba(251,113,133,0.15)`.
  - `experience`: light `#047857` / soft `rgba(4,120,87,0.14)`; dark `#34d399` / soft `rgba(52,211,153,0.14)`.

## Types (`src/lib/types/content.ts`)

- `Experience`: `id, company, position, employmentType, location, startDate, endDate?, isCurrent, description, responsibilities, technologies, companyUrl?, order`.
- `Project`: `id, title, slug, shortDescription, fullDescription, type, technologies, featuredImage?, gallery, githubUrl?, liveUrl?, startDate, endDate?, order, featured, published, caseStudy, createdAt?, updatedAt?`.
  **No `status` field** — derive UI status from `liveUrl`/`endDate` (e.g. `liveUrl` → "LIVE"; no `endDate` → "IN PROGRESS"; else "SHIPPED").
- `ProjectCaseStudy`: `problem?, solution?, approach?, challenges?, results?`.
- Also: `Skill`, `About`, `SiteSettings`, `ContactMessage`.
- Existing route `/projects/[slug]` is fully built — link to it (`Link href={`/projects/${project.slug}`}`), don't duplicate case-study content.

## Motion / animation foundation

- `src/lib/experience/springs.ts` — `SPRING = {cursor, trail, snappy, panel, rail, camera}` each
  `{stiffness, damping, mass}`; `spring(name)`; `springOrCut(name, reducedMotion)`;
  `GLITCH = {charDuration:0.045, passes:3, charset:"..."}`.
- `src/lib/experience/use-scramble.ts` — `useScramble(text, {active, delay, step})`. RAF/wall-clock
  char-reveal; returns final text immediately under reduced motion. Pairs with `ScrambleText`.
- `src/components/experience/text/scramble-text.tsx` — `ScrambleText({text, className, delay, fixedWidth=true, active=true})`.
  `active` defaults to true, which resolves once on mount — **anything below the fold must pass a
  scroll-driven value**, or the effect plays out off screen and the reader only meets settled text.
- `src/components/motion/variants.ts` — `EASE_OUT`, `EASE_IN_OUT`, `DURATION`, `STAGGER_STEP`,
  `baseTransition`, `MotionDirection`, `createFadeVariants`, `createStaggerVariants`, `VIEWPORT`.
- `src/components/motion/curtain.tsx` — `Curtain({children, className, delay})`.
- `src/components/motion/reveal.tsx` — `Reveal({children, direction, delay, distance, as, ...props})`.
- `src/components/motion/stagger.tsx` — `Stagger`, `StaggerItem`.
- `src/components/motion/scroll-progress-line.tsx` — `ScrollProgressLine({children, className, railClassName="left-0"})`.
  `useScroll({target: ref, offset:["start 80%","end 65%"]})` + `useSpring(SPRING.rail)`;
  gated by `useHydrated() && !reducedMotion`. `railClassName` is an escape hatch, not an
  enum, because a rail has to track markers that may move between breakpoints — the
  timeline passes `"left-4 -translate-x-1/2 md:left-1/2"`.
- `src/components/motion/scroll-veil.tsx` — `ScrollVeil({children, className, exit=true, variant="fade"})`,
  `VeilVariant = "fade"|"rise"|"expand"|"tilt"|"settle"|"zoom"`. One `useScroll` over a 4-stop
  `OFFSET`, four `useTransform`s driven by a per-variant `SHAPES` table (`y`/`scale`/`rotateX`
  ranges), `transformPerspective: 1400` always on. **Variants vary only those three channels** —
  nothing in the app sets `overflow-x: hidden` (verified), so horizontal travel would give the
  document a scrollbar; `rotateX` never widens an element. `exit={false}` freezes the outbound
  half for a section with nothing after it.
- `src/lib/experience/use-typing-pulse.ts` — `useTypingPulse(): {energy: MotionValue<number>, bump()}`.
  Exponential decay (`BUMP 0.34`, `DECAY 3.2`/s, `FLOOR 0.002`) on a self-cancelling RAF loop, so an
  idle form costs nothing. Motion value, not state. **The loop is a hoisted `function` declaration
  inside `bump`, not its own `useCallback`** — a memoized arrow that schedules itself reads its own
  binding before declaration, which `react-hooks/immutability` rejects as an error.
- `src/lib/hooks/use-motion-preference.ts` — `useMotionPreference(): boolean` (prefers-reduced-motion).
- `src/lib/hooks/use-media-query.ts` — `useMediaQuery(query, serverValue)`, `useFinePointer()`.
- `src/lib/experience/use-scroll-velocity.ts` — `useScrollVelocity(target?): MotionValue<number>`.
  Smoothed, sign-agnostic scroll speed (`useVelocity` → normalised 0..~3 → `useSpring`); held at 0
  under reduced motion via `.jump(0)`. Motion value, not state — read it in a `useFrame` loop, don't
  put it in JSX expecting re-renders.
- `src/lib/hooks/use-focus-trap.ts` — `useFocusTrap(panelRef, active, onClose, triggerRef?)`. Shared
  extraction of `mobile-menu.tsx`'s hand-rolled pattern (see Modals section below) for any modal that
  can't use native `<dialog>`.
- Ground rule reminder: Motion (`motion/react`) for text/stagger/layout/buttons/cards/modals/springs/
  page transitions; R3F only for environments/particles/cameras; GSAP reserved for complex
  ScrollTrigger timelines; no hardcoded hex (use CSS tokens/`useCssColors`); reduced motion holds
  the world still, never deletes it.

## 3D / R3F foundation

- `src/lib/experience/use-scene-active.ts` — `useSceneActive<T>(): [RefObject<T|null>, boolean]`.
- `src/lib/experience/use-scene-budget.ts` — `useSceneBudget(): SceneBudget`
  (`useSyncExternalStore`-based). **Already applies `stillBudget()` internally when
  `useMotionPreference()` is true** — consumers never special-case reduced motion for particle
  counts. Only need to gate autonomous per-frame loops (`if (still) return`); scroll/pointer-driven
  positioning can stay active under `still` since it's user-driven.
- `src/lib/experience/device-tier.ts` — `Tier`, `SceneBudget` shape
  `{tier, maxDpr, particles, segments, postProcessing, shadows, galaxyNodes}`, `BUDGETS`
  (low/mid/high), `DEFAULT_BUDGET = BUDGETS.mid`, `budgetFor`, `stillBudget`, `classify`, `detectTier`.
- `src/lib/experience/use-css-colors.ts` — `useCssColors(names, scope?): Record<string,string>`.
  Resolves via probe element + `getComputedStyle().color`, re-reads on `MutationObserver`
  (class/style/data-tone). Convention (identical in `hero-scene.tsx` / `galaxy-scene.tsx`):
  ```ts
  const SAFE = { tone: "white", bg: "black", fg: "white" };
  const TOKENS = ["--tone", "--bg", "--fg"] as const;
  const TONE_SCOPE = '[data-tone="experience"]'; // or '[data-tone="work"]' etc.
  ```
- `src/lib/experience/use-pointer.ts` — `usePointer(): {current:{x,y}}`. Ref-based (not state), -1..1,
  y-up, decays to centre on leave — avoids re-render at animation-frame frequency.
  **Normalised against the window**, which only lines up with a scene for a full-bleed canvas. A
  canvas occupying a band of the page needs canvas-relative coordinates instead (see
  `arcade-scene.tsx`'s `useClientPointer`).
- `src/lib/experience/random.ts` — `seededRandom(seed)` (mulberry32),
  `sphericalCloud(count, {seed, inner, outer, flatten})` — use for any particle/scatter generated at render.
- All five canvases share one mount split: `next/dynamic(() => import("./x-scene"), {ssr:false,
  loading: () => null})` + `useSceneActive`. `hero-canvas.tsx` was the last holdout — it carried a
  hand-rolled IntersectionObserver + `visibilitychange` pair that predated the hook.
- `src/components/experience/hero/hero-scene.tsx` (349 lines) — primary R3F environment reference.
  `SceneProps{active, still}`; `CameraRig` (window-event dash via `HERO_ENTER_EVENT`); `Core`
  (pointer-reactive icosahedron); `Platform` (concentric tori); `Floaters` (drei `Float`); `Dust`
  (seeded cloud, rotated as one object); conditional drei `Stars`; `easeOutCubic`.
- `src/components/experience/skills/galaxy-scene.tsx` — second R3F reference. See the Skills
  section below for the full breakdown.

## Reusable interaction primitives

- `src/components/experience/tilt-card.tsx` — `TiltCard({children, max=9, glare=false, className})`
  (perspective wrapper + pointer-rotated inner `motion.div`; plain div fallback under
  reduced-motion/coarse-pointer); `TiltLayer({children, depth=20, className})` (translateZ depth
  layer, meaningful only inside a `TiltCard`).
- `src/components/experience/magnetic.tsx` — `Magnetic({children, strength=0.32, tilt=0, className})`.
  Moves an inner `motion.span`; layout box unaffected.
- `src/components/experience/profile/hud-panel.tsx` — `HudPanel`, `Edge` type, `OFFSETS`,
  `createVariants`, `Brackets`. Bracketed panel-entrance-from-edge pattern.
- `src/components/experience/profile/hud-shell.tsx` — `HudShell({children, className})`.
  Pointer-spotlight/scanline chrome, spotlight measured against the panel element (not viewport).

## Modals / focus-trap patterns

- `src/components/ui/dialog.tsx` — native `<dialog>` + `showModal()`/`close()`. Gives focus-trap,
  Escape-to-close, top-layer stacking for free. Use for modals anchored to a trigger, not tied to a
  grid position (e.g. Experience's "expand a role into a modal scene").
- `src/components/layout/mobile-menu.tsx` — hand-rolled focus-trap pattern (needed wherever native
  `<dialog>` can't be used, e.g. a Motion `layoutId` shared-element expansion):
  - `const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';`
  - keydown listener: Escape closes; Tab wraps at first/last focusable element found via
    `panelRef.current.querySelectorAll(FOCUSABLE)`.
  - body scroll lock: `document.body.style.overflow = "hidden"` on open, restored on cleanup.
  - initial focus moved into panel via `window.setTimeout(() => …, 0)`.
  - focus returned to trigger element in a `close()` helper.
  - `role="dialog" aria-modal="true" aria-label="…"` on the panel.
  - Now extracted into `src/lib/hooks/use-focus-trap.ts` (see above) — `mobile-menu.tsx` predates it
    and still owns its own copy; new non-`<dialog>` modals should use the hook instead.

## Tech / content display primitives

- `src/components/ui/tech-chip.tsx` — `TechChip({name, iconUrl, className})`.
- `src/components/ui/tech-tile.tsx` — `TechTile({name, iconUrl, size="sm"|"md", className})`.
  Prefers `iconUrl` (via `isAllowedImageSrc`); else brand-tinted monogram
  (`getBrandColor`/`getMonogram`). `sm` = inline/marquee (`size-6`), `md` = card layouts (`size-10`).
- `src/lib/utils/tech-icons.ts` — `TechIconMap`, `buildTechIconMap`, `lookupTechIcon`.
- `src/lib/constants/tech-brand.ts` — `BRAND_COLORS` (js/ts/php/python/react/next/tailwind/node/
  redux/stripe/laravel/django/postgres/mongodb/firebase/redis/git/docker/aws/supabase/…),
  `FALLBACK_COLOR = "#8b8b8b"`, `canonicalTechKey(name)` (lowercases, strips non `[a-z0-9+#]`, drops
  trailing "js" unless the whole name), `getBrandColor(name)`, `getMonogram(name)` (up to 2 chars —
  initials for multi-word names, else first 2 letters).
- `src/lib/constants/images.ts` — `REMOTE_IMAGE_HOSTS`, `isAllowedImageSrc(url)`.
- `src/components/projects/project-card.tsx` — stretched-link technique
  (`after:absolute after:inset-0 after:content-['']`) for whole-card-clickable + image/monogram fallback.

## Empty/demo states

- `src/lib/constants/demo-content.ts` — `DEMO_ID_PREFIX`, `isDemoId`, `hasDemoContent(items)`,
  `isDemoContentEnabled`, `DEMO_PROJECTS` (4: atlas/beacon/meridian/signal), `DEMO_EXPERIENCES`
  (4: Northwind Digital/Lumen Systems/Orbit Studio/Kestrel Software), `DEMO_SKILL_SEED`/`DEMO_SKILLS`,
  `DEMO_ABOUT_STATS`, `isDemoAboutStats`. Sections must keep showing a `DemoBadge`/`EmptyState` when
  data is empty/sample.
- `src/components/ui/empty-state.tsx` — `EmptyState({icon, title, description, action, className})`.
- `src/components/ui/demo-badge.tsx` — `DemoBadge({label})`.
- `src/components/ui/section-heading.tsx` — `SectionHeading({eyebrow, title, description, action, note, align, className, id})`.
- `src/components/ui/badge.tsx` — `Badge({children, variant, className})`.
- `src/components/ui/button.tsx` — `Button`, `ButtonLink`, `buttonClasses(variant, size, className)`.

## Other utils

- `src/lib/utils/dates.ts` — `formatMonthYear`, `formatFullDate`, `formatDateRange`, `formatDuration`,
  `formatYearRange`, `toDateTimeAttribute`.
- `src/lib/utils/career.ts` — `PlayerLevel` interface, `playerLevel(experiences, now?)`.
- `src/lib/hooks/use-active-section.ts` — `useActiveSection(sectionIds): string | null`. One
  `IntersectionObserver` for all page-level nav sections at once (`rootMargin: "-96px 0px -55% 0px"`,
  `threshold: [0, 0.15, 0.35, 0.6, 1]`, highest ratio wins, document-order tie-break). Keyed to fixed
  page-level nav ids — **not** directly reusable for per-era/per-item tracking inside a section; mirror
  the pattern locally instead (e.g. a colocated `use-active-era.ts`).
- `src/components/experience/scroll/scroll-rail.tsx` — confirms `activeSection` is computed once
  centrally and passed down as a prop, rather than each consumer running its own observer.

## Current section implementations

- `src/components/sections/experience.tsx` — server component; empty/demo state only, delegates the
  timeline to `Timeline`. Props unchanged: `{experiences: ExperienceEntry[], techIcons: TechIconMap}`.
- `src/components/sections/projects.tsx` — server component; empty/demo state only, delegates the
  grid to `Arcade`. Props: `{projects: Project[], totalCount: number, techIcons: TechIconMap}`.
  `HOME_LIMIT = 5`.
- `src/components/sections/about.tsx` — Pass 2 composition reference (already reads game1.md-style).

## Experience — "THE TIMELINE MACHINE" (`src/components/experience/timeline/`)

- `timeline.tsx` — client mount: owns `useActiveEra`, `useScrollVelocity(containerRef)`, and expanded-
  role state; composes `TimelineCanvas`, a centred `ScrollProgressLine` of `TimelineEntry`s, and
  `RoleScene`. `Timeline({experiences, techIcons})`.
- `use-active-era.ts` — `useActiveEra(count): {activeIndex, entered, registerEra}`. Colocated
  generalisation of `use-active-section.ts`'s pattern to index-based tracking; `registerEra(index)`
  returns a **cached** ref callback (one per index, so a re-render does not detach/re-attach the whole
  list) that stamps `dataset.eraIndex` and registers the node with one shared `IntersectionObserver`
  (`rootMargin: "-40% 0px -40% 0px"`, highest-ratio-wins). `entered` stays false until something has
  actually crossed the centre band — `activeIndex` starts at 0 either way, so anything that fires *on
  arrival* at an era must gate on `entered` or it runs while the section is off screen.
- `timeline-entry.tsx` — one role card: `TiltCard`/`TiltLayer`, `ScrambleText` for the era label and
  date range (both gated on `isActive`, so the glitch plays on arrival), `Magnetic`-wrapped expand
  button, `Reveal` entrance (direction alternates with `align`).
  `TimelineEntry({entry, index, align, isActive, techIcons, registerRef, onExpand})`. Alternates
  left/right of the centre rail by index parity; single column with left padding below `md`. The rail
  node grows and takes `--tone-soft` while active, matching the tunnel ring the canvas brightens.
- `role-scene.tsx` — expanded-role modal on the shared `Dialog` (native `<dialog>`, not
  `use-focus-trap.ts` — no `layoutId` involved). `RoleScene({entry, open, onOpenChange, techIcons})`.
- `timeline-canvas.tsx` — dynamic-import mount (`ssr:false`) + `useSceneActive<HTMLDivElement>()` for
  `timeline-scene.tsx`, same split as `hero-canvas.tsx`. `TimelineCanvas({eraIndex, eraCount, velocity})`.
- `timeline-scene.tsx` — R3F tunnel: `TunnelDolly` (camera dollies to `-eraIndex * SPACING`, fully
  frozen under `still`, mirrors hero's `CameraRig`), `TunnelRings` (one torus per era, brightest nearest
  camera), `ParticleField` (velocity-throttled stream; per-particle `relZ` tracked relative to camera,
  only `z` rewritten per frame via `BufferAttribute.setZ`, wraps rather than rigid-rotates like the
  hero's `Dust` since it needs directional wraparound; `frustumCulled={false}` because the bounding
  sphere is computed once from the initial buffer and the points outrun it). Colours via
  `useCssColors` scoped to `[data-tone="experience"]`; sizes via `useSceneBudget`.
  `Ring` damps its own `material.opacity` in `useFrame` so eras cross-fade instead of stepping —
  **but only when `!still`**: under `frameloop="demand"` the loop wakes on three.js prop changes, not
  on a damp, so `still` hands `opacity` back to React as a JSX prop. Same trap for any
  imperatively-animated material in a demand-frameloop scene.

## Skills — "SKILL UNIVERSE" (`src/components/experience/skills/`)

- **Per-category palette.** `src/lib/constants/skill-palette.ts` — `SKILL_CATEGORY_TOKENS`
  (`Record<SkillCategory, string>` of CSS custom-property *names*), `SKILL_COLOR_TOKENS` (the same
  in `SKILL_CATEGORIES` order, **one stable module-level array** because `useCssColors` keeps
  `names` in an effect dep list), `skillCategoryColor(category) → "var(--skill-…)"`. Values live in
  `globals.css` on `[data-tone="stack"]` / `.dark [data-tone="stack"]` (light-700 / dark-400 split,
  same as the tones). The sky and the chips read the *same* five tokens — that is the point; a hue
  change is one edit.
- `globals.css` `@layer components` also carries `.skill-chip` / `.skill-chip-dot`, both driven by
  an inherited `--chip` custom property so hover and `[aria-pressed="true"]` are CSS, not React
  state.
- `galaxy-layout.ts` — `buildGalaxy(skills, maxNodes): GalaxyLayout`. `GalaxyNode` carries
  `proficiency?` and `variant` (index within its own orbit) alongside the geometry; both are
  *content*, and what they look like is the scene's business.
- `skill-universe.tsx` — client island. `SkillUniverse` owns the Universe/Chain mode toggle;
  `GalaxyStage` owns `selectedId`/`hoveredId` (the canvas and the chip list are two views of one
  selection), `placed`/`sceneSelectedId` (a budget-culled skill still gets a chip and a panel, but
  no camera flight and no card), the tooltip springs, and `cardX`/`cardY` — plain motion values,
  **unsprung**, because a spring would trail behind the planet it labels. `toggle()` seeds them to
  the stage centre *only* when opening from nothing, so the card's entrance does not start in the
  top-left corner; moving between planets lets it travel. Chips are grouped by category in
  `SKILL_CATEGORIES` order (= inner→outer orbit order), each group setting `--chip` once on its
  `<li>` so the label, the dot and every chip inherit it.
  - `PlanetCard` — the card that rides above the chosen planet. `aria-hidden` +
    `pointer-events-none`, same reasoning as the hover tooltip: everything on it is already in the
    `aria-live` `SkillDetail` aside, and a card that swallowed clicks would make the galaxy
    undraggable wherever it floated. Outer `motion.div` takes the projected point via `style={{x,y}}`;
    the inner one carries `-translate-x-1/2 -translate-y-full` — Tailwind v4 compiles those to the
    CSS `translate` property, which composes with Motion's `transform` instead of fighting it.
- `galaxy-scene.tsx` — `Spin` interface + drag/inertia consts (`DRAG_RATE, INERTIA_DECAY, DRIFT,
  DRAG_THRESHOLD`), `advanceSpin`; `GalaxyRoot`; `CameraRig` (flies to a `focus` ref written by the
  selected `Planet`); `Sun`; `OrbitRing` (per-category colour); `Planet`; `Sparks` (per-node burst
  via `sphericalCloud`, cyclic scale/opacity — not a real sim).
  - `TOKENS = ["--tone","--bg","--fg", ...SKILL_COLOR_TOKENS]`, `TONE_SCOPE = '[data-tone="stack"]'`.
    `palette` = one `THREE.Color` per category; `shades` = per-node, category hue lerped toward
    `--fg` by `min(node.variant,4)*0.07` so neighbours on one ring stay tellable apart.
  - **A planet says what it is twice**: hue = category, and so does the solid (`PlanetBody`:
    languages→tetrahedron, frontend→icosahedron, backend→octahedron, database→cylinder,
    tools→dodecahedron). Shape survives colourblindness/greyscale; colour alone does not.
    `Ornament` encodes proficiency on top: expert→tilted torus ring, proficient→wireframe cage,
    below that→nothing; `learning` additionally draws the body `wireframe`.
  - `Planet` nests `<group ref={body}>` (hover scale + `getWorldPosition(focus.current)`) around
    `<mesh ref={mesh}>` (self-tumble, rate `0.14 + (variant%4)*0.11`). Scale on the group so a
    ringed planet grows with its ring; tumble on the mesh so the ring keeps its tilt.
  - `CardAnchor` — sibling of `CameraRig`, **outside `GalaxyRoot`** (it reads a world position).
    Projects `focus.current + lift` through `camera` and writes `anchor.x/y` in canvas pixels from
    `useFrame`'s `size`. Early-returns when nothing is selected, so the last position survives the
    card's exit animation. **Gotcha:** `point.y += lift` is a `react-hooks/immutability` *error* —
    the vector came from `useMemo`. Use `.setY(...)`; a method call is fine, a property write is not.

## Projects — "PROJECT ARCADE" (`src/components/experience/arcade/`)

- `arcade.tsx` — client mount: owns `hoverCount` (a count, not a bool — hover can start on one
  cartridge and end on another before the first `pointerleave` fires) and `selectedId`; filters the
  selected project out of the grid (its `Cartridge` unmounts) and mounts `ExpandedCartridge` with the
  matching `layoutId` inside `AnimatePresence`, so Motion morphs one into the other rather than
  cross-fading. `Arcade({projects, techIcons})`.
- `cartridge.tsx` — one grid card: `TiltCard`/`TiltLayer` (`glare` on), status badge via
  `project-status.ts`, up to 5 `TechTile`s, `Magnetic`-wrapped "Play project" affordance. The whole
  card is a `<button>` (not the stretched-link pattern `ProjectCard` uses — expansion needs a click
  handler, not navigation). Carries `layoutId={`cartridge-${project.id}`}` unconditionally; a `dimmed`
  prop fades/scales it back (opacity 0.25, scale 0.94) while a sibling is selected.
  `Cartridge({project, techIcons, dimmed, restoreFocus, onHover, onSelect})`. `restoreFocus` exists
  because selecting one unmounts it — the focus trap has no live trigger to hand focus back to, so
  the restored cartridge claims it on remount. `Arcade` also zeroes `hoverCount` on select and on
  close: a hovered cartridge that unmounts never fires its `pointerleave`.
- `expanded-cartridge.tsx` — the overlay a click grows into: scrim + panel, panel carries the same
  `layoutId` as the `Cartridge` it replaces. Built on `use-focus-trap.ts`, not `Dialog` — the
  `layoutId` morph needs a plain positioned element, not one promoted to the top layer. **Portalled
  into `document.body`** for the `ScrollVeil` reason above; the morph still works across the portal
  because Motion projects viewport rects. Contains
  `BrowserPreview`, full description, all tech (`TechChip`), case-study/live/source links.
  `ExpandedCartridge({project, techIcons, onClose})`.
- `browser-preview.tsx` — the animated fake browser window (never a static screenshot): traffic-light
  dots, address bar (`liveUrl` host, or `localhost/{slug}` when there isn't one), a loading bar that
  sweeps once on mount, floating `TechTile`s that fade in *after* the bar finishes (the simulated
  load has to gate something, or it is a decorative stripe over content that was already there), a
  cursor wandering a fixed path on a full-size `absolute inset-0` layer animated with `x`/`y`
  percentages — never `left`/`top`, which relayouts the frame on every one of the ~480 frames that
  loop runs. All skipped/frozen under reduced motion.
  `BrowserPreview({project, techIcons, className})`.
- `arcade-scene.tsx` / `arcade-canvas.tsx` — shared R3F background behind the whole grid (one canvas,
  not one per card): ambient `Dust` (same technique as the hero's) plus a `HoverBurst` spark cloud
  that fades in while any cartridge reports `hovered`. It uses a local `useClientPointer` (raw client
  coords) mapped through `gl.domElement.getBoundingClientRect()` and `viewport.width/height` once per
  frame — not the shared `usePointer`, which is window-normalised and would land the burst near the
  cursor rather than under it. Colours via `useCssColors`
  scoped to `[data-tone="work"]`; same dynamic-import + `useSceneActive` mount split as every other
  scene. `ArcadeCanvas({hovered})`.
- `src/lib/utils/project-status.ts` — `Project` has no `status` field, so it's derived:
  `projectStatus({liveUrl, endDate}): "live" | "in-progress" | "shipped"` (`liveUrl` → live; no
  `endDate` → in-progress; else shipped), `PROJECT_STATUS_LABELS`.

## Contact — "OPEN A TRANSMISSION" (`src/components/experience/transmission/`)

- `src/components/sections/contact.tsx` — server component; resolves the settings document into
  plain values (`resolveEmailLink`/`resolvePhoneHref`/`resolveSocialLinks` from `lib/utils/social`)
  and hands them to `Transmission`. `Section exit={false}` — nothing follows it, so its bottom edge
  never reaches the top of the viewport and the exit fade would strand the form dimmed.
- `transmission.tsx` — the client boundary (not the section): owns `useInView(ref, {once:true})`,
  the one thing the server cannot know. Two columns (`lg:grid-cols-[0.85fr_1.15fr]`): channel panel
  (terminal boot, direct address/phone/location/availability, `SocialButtons`) and the form.
  `Transmission({email, phoneHref, socials, location, availability})`. The email address is never
  gated behind the form — a form can fail for reasons neither side controls.
- `terminal-boot.tsx` — `ESTABLISHING CONNECTION…` → `READY TO RECEIVE TRANSMISSION.`, one line per
  `LINE_DELAY = 620`ms, gated on `active`. **The reduced-motion log is derived in render**
  (`const shown = reducedMotion ? LINES.length : timed`) and the effect early-returns — writing it
  from the effect trips `react-hooks/set-state-in-effect`.
- `transmission-form.tsx` — RHF + zod (`contactSchema`, `contactDefaults`). `CHANNELS` is the field
  list; `channelComplete()` validates one value against its own slice of the schema; `openChannels`
  only ever grows — clearing an earlier field must not unmount a later one the visitor may be
  focused inside — with an escape hatch to open all at once. `watch()` raises a
  `react-hooks/incompatible-library` compiler-skip warning; inherent to RHF, not a defect.
- `transmission-field.tsx` — `TransmissionField({index, label, filled, error, hint, children, className})`.
  Children are a **render prop** receiving `{id, "aria-describedby", "aria-invalid"}`, so the a11y
  wiring cannot be silently clobbered by spread order. Owns its own focus state via
  `onFocusCapture`/`onBlurCapture`; `engaged = focused || filled` keeps the label lifted on blur.
- `wave-form.tsx` — the sound-wave row. `WaveForm({energy, live, className})`; `BAR_COUNT = 28`,
  per-bar envelope + phase offset built once in `useMemo` (a `useRef(...).current` read during
  render is a `react-hooks/refs` **error** under this repo's lint), bars written imperatively in a
  frame loop rather than through state.
- `transmit-button.tsx` — `TransmitStatus = "idle"|"sending"|"sent"`, `LABELS` (`[ TRANSMIT ]` /
  `[ CHARGING... ]` / `[ SIGNAL SENT ]`). A `useMotionValue` charge bar animated to `HOLD = 88`%
  while sending and 100% on success; duration 0 under reduced motion.

## Footer (`src/components/experience/footer/`)

- `src/components/layout/site-footer.tsx` — still a Server Component; three children own their own
  client boundaries. **`data-tone="contact"` on the `<footer>` is load-bearing** — it is the scope
  `planet-scene.tsx` resolves `--tone` against.
- `planet-canvas.tsx` / `planet-scene.tsx` — wireframe globe (`WireframeGeometry`, so the lines stay
  one pixel wide instead of thickening as the sphere fills the frame), faint solid core so the far
  side is occluded, tilted torus, one satellite positioned in the parent group's space, plus the
  hero's dust. Everything animated is a transform, so `still` can freeze the loop without stranding
  a material mid-damp under `frameloop="demand"`. **The canvas is not rendered at all below `sm`**
  (`useMediaQuery("(min-width: 40rem)")` → `return null`): a `display:none` canvas still constructs
  and holds a WebGL context for the life of the page.
- `system-status.tsx` — `SYSTEM STATUS: ONLINE`. Reports `STATIC` until `useHydrated()`, because
  claiming a live system that is not running is the one piece of fiction on the page that costs the
  reader something. The scramble is `aria-hidden`; a settled `sr-only` copy is what is announced.
- `magnetic-socials.tsx` — `MagneticSocials({links, className})`. A separate component rather than a
  `magnetic` prop on `SocialButtons`, which would drag the contact panel's non-interactive copy
  across the client boundary too. Marks shared through `src/components/ui/social-icon.tsx`
  (`SocialIcon({label, className})`) so the two rows cannot drift apart.

## Game Mode (`src/components/play/`, `src/app/play/`)

- `arcade-chrome.tsx` — shared chrome in the rebuilt language: `ArcadeExit`, `ArcadeScore`
  (zero-padded, `tabular-nums`), `ArcadePanel({status, title, children, actions})`, `ArcadeAction`
  (forwards **all** `ButtonHTMLAttributes` so game ids survive; renders `[ {children} ]`),
  `ArcadeActionLink`, and `ArcadeScope`. `ArcadeScope` renders `<div className="dark contents">`
  around `<div data-tone="work">` — two elements, because `globals.css` matches
  `.dark [data-tone="work"]` as a **descendant** selector, and `contents` keeps the outer out of
  layout. Needed because the games are full-bleed dark canvases outside `(site)`, where the
  light-theme tone value would land near 3.2:1.
- `game-overlay.tsx`, `whack-a-mole/whack-a-mole-game.tsx` and `src/app/play/page.tsx` (cabinet
  select) all sit on that chrome. **`lib/game/input/lifecycle-controls.ts` binds one delegated
  `document` click listener via `target.closest('#id')`** — markup can change freely as long as
  `play-btn`, `resume-btn`, `restart-btn` and `pause-btn` survive.

## Plan doc

- `game1.md` — the gamified-portfolio plan. Pass 1/2/3 checked off. Has a "Shared foundation" table
  (add new reusable hooks/components as rows when built) and a "Known issues" section (pre-existing,
  out-of-scope `share-donut.tsx:39` lint failure). Close-out step = lint + typecheck + build.
