# Hybrid Gamification — Implementation Plan & Tracker

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

This file is the single source of truth for the gamification work. Every time
a part below is implemented or edited, its checkbox is updated in the same
commit/session that does the work — this document is not written up front and
forgotten.

---

## 0. Codebase audit (done before any code was written)

The brief asks for this explicitly: analyze first, reuse aggressively, extend
incrementally. Findings:

### Design system already in place
- **Motion vocabulary** — [variants.ts](src/components/motion/variants.ts)
  (`EASE_OUT`, `DURATION`, `createFadeVariants`, `createStaggerVariants`,
  `VIEWPORT`) and [springs.ts](src/lib/experience/springs.ts) (`SPRING.*`,
  named by feel, not by number). All new motion must draw from these, not
  invent new curves.
- **Motion primitives** —
  [Reveal](src/components/motion/reveal.tsx),
  [Stagger/StaggerItem](src/components/motion/stagger.tsx),
  [AnimatedText](src/components/motion/animated-text.tsx) (word-by-word,
  a11y-safe), [Curtain](src/components/motion/curtain.tsx) (clip-reveal),
  [ScrollVeil](src/components/motion/scroll-veil.tsx) (section-level
  scroll-linked fade), [ScrollProgressLine](src/components/motion/scroll-progress-line.tsx)
  (fill-as-you-read rail). Every one already reduces to a plain appearance
  under `useMotionPreference()`. **No new animation primitives are needed for
  Phase 3** — sections combine these, they don't replace them.
- **`motionElement()` cache** — [motion-element.ts](src/components/motion/motion-element.ts)
  memoises `motion.create()` per tag; new game components that need a raw
  `motion.*` element should still prefer the existing primitives above it.
- **Section shell** — [Section](src/components/sections/section.tsx) +
  [SectionHeading](src/components/ui/section-heading.tsx) own the anchor id,
  `aria-labelledby`, numbered eyebrow (`"01 — About"`, `"02 — Stack"`, ...),
  and per-section `tone` (see [section-tone.ts](src/lib/constants/section-tone.ts)).
  The eyebrow numbering is already quasi-game-like ("level" framing) — Phase 3
  leans into it rather than adding a competing numbering scheme.
- **Toast system** — [ui/toast.tsx](src/components/ui/toast.tsx), mounted at
  the root ([layout.tsx](src/app/layout.tsx)) so it's available on every
  route. This **is** the achievement-popup mechanism the brief asks for; it
  is extended with an `"achievement"` variant rather than duplicated.
- **Focus trap / media query hooks** — [use-focus-trap.ts](src/lib/hooks/use-focus-trap.ts)
  and [use-media-query.ts](src/lib/hooks/use-media-query.ts) already existed,
  fully built, **but unused anywhere in the app**. Reserved for the
  Achievements drawer / mission modal in a later phase.
- **No state library in `package.json`.** Every browser-only piece of state
  in this codebase (`useMotionPreference`, `useSceneBudget`, `useHydrated`)
  is a hand-rolled `useSyncExternalStore` module. The gamification store
  follows the same pattern instead of adding Zustand/Redux/Jotai.

### Gamification groundwork that already existed, unwired
Two files were sitting in the tree, written, unused by any component:
- [lib/utils/career.ts](src/lib/utils/career.ts) — `playerLevel()` derives a
  **LEVEL and XP bar from real experience data** (years since the first
  role). Its own comment states the philosophy this whole plan follows: *"a
  made-up number in a portfolio is a made-up number about the person."*
  Reserved for the About "Player Profile" — never for the global HUD, which
  needs a number about the *visitor*, not the developer (see §1).
- [lib/utils/project-status.ts](src/lib/utils/project-status.ts) —
  `projectStatus()` derives `"live" | "in-progress" | "shipped"` from fields
  that already exist. Feeds the Projects "mission status" badge directly.

### A larger interactive layer, also unwired
`three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, and `lenis` are
already in `package.json`, and [src/lib/experience/](src/lib/experience/)
has a complete, uncommitted budget/device/interaction layer for it:
`device-tier.ts` + `use-scene-budget.ts` (particle/segment/shadow counts
scaled to hardware, floored — never switched off — under reduced motion),
`use-pointer.ts`, `use-scene-active.ts` (pauses off-screen/backgrounded
canvases), `use-scramble.ts` + `GLITCH` (already used by nothing but
imported once), `use-scroll-velocity.ts`, `use-typing-pulse.ts`,
`use-css-colors.ts`, `random.ts`. Comments inside reference a "hero core"
and a "skill-galaxy" that don't exist as components yet. **This is Phase 5's
starting point, not something to rebuild** — see Phase 5 in §2.

### Skills/Experience sections were already mid-transformation
Uncommitted changes to [tech-chain.tsx](src/components/skills/tech-chain.tsx)
(+115 lines) and the new [skill-card.tsx](src/components/skills/skill-card.tsx)
already implement "click a technology to reveal a floating detail card" —
almost verbatim the brief's "SKILL DISCOVERED" concept. Likewise
`scroll-progress-line.tsx` already gives Experience its animated fill-rail.
Phase 3 for these two sections is about **framing and connecting to
progress**, not building the interaction from scratch.

---

## 1. Architecture decisions

- **State**: a vanilla `subscribe`/`getSnapshot` store
  ([lib/store/game-store.ts](src/lib/store/game-store.ts)), read via
  `useSyncExternalStore` — zero new dependencies, matches every existing
  browser-state hook in the codebase.
- **Persistence**: `localStorage` only, wrapped in try/catch (private
  browsing / quota). No backend — there is nothing here that needs to sync
  across a visitor's devices.
- **Two separate "levels", on purpose**:
  - **Career level** (`playerLevel()` in `career.ts`) — real, about the
    developer, shown in the About "Player Profile" only.
  - **Explorer level** (`explorerProgress()` in `lib/game/xp.ts`) — about
    *this visitor's* engagement (sections seen, skills opened, projects
    read), shown in the HUD only. It's honest by construction: it never
    claims anything about the person being portfolio'd.
  - The two are never merged into one number.
- **XP sources are capped at three** (`XP_RULES` in
  [lib/game/game-config.ts](src/lib/game/game-config.ts)): section
  discovered, skill opened, project opened. Per the brief — "do not award XP
  excessively" — nothing else grants XP (no hover-farming, no scroll-percent
  farming).
- **Achievements are config-driven** — one record in
  [lib/game/achievements.ts](src/lib/game/achievements.ts), each entry a
  pure `isUnlocked(state)` predicate. Adding one later is a data change, not
  a new code path.
- **Game Mode is additive, never subtractive.** Turning it off must never
  hide portfolio content — only the HUD, and later the optional interactive
  layer, appear/disappear. This is enforced today by `GameHUD` returning
  `null` outright in Normal Mode rather than just hiding visually.

---

## 2. Phase status

### Phase 1 — Analysis
- [x] Inspected folder structure, sections, motion files, hooks, types,
      routing, styling conventions, and the existing (unwired) gamification
      groundwork. See §0 above.

### Phase 2 — Foundation
- [x] [lib/types/game.ts](src/lib/types/game.ts) — `GameMode`,
      `AchievementId`, `Achievement`, `GameProgressState`.
- [x] [lib/game/game-config.ts](src/lib/game/game-config.ts) — `XP_RULES`,
      `EXPLORER_LEVEL_THRESHOLDS`, `QUEST_LABELS`.
- [x] [lib/game/xp.ts](src/lib/game/xp.ts) — `explorerProgress(xp)`.
- [x] [lib/game/achievements.ts](src/lib/game/achievements.ts) — the 5
      starter achievements (`adventurer`, `explorer`, `skill-scout`,
      `project-hunter`, `full-clear`) + `evaluateAchievements()`.
- [x] [lib/store/game-store.ts](src/lib/store/game-store.ts) — the
      `useSyncExternalStore`-compatible store: `setMode`, `discoverSection`,
      `viewSkill`, `viewProject`, all persisted to `localStorage`.
- [x] [lib/hooks/use-game-progress.ts](src/lib/hooks/use-game-progress.ts).
- [x] `prefers-reduced-motion` support — nothing new needed; every game
      component reads the existing `useMotionPreference()` hook exactly like
      the rest of the app.

### Phase 3 — Core UI gamification (section by section)
- [x] **Hero → game start screen.** [hero.tsx](src/components/sections/hero.tsx):
      added a decorative `label-mono` "Status: Online" line above the real
      availability pill (aria-hidden — the pill still carries the real status
      for assistive tech). The primary CTA now renders via new
      [start-adventure-link.tsx](src/components/game/start-adventure-link.tsx),
      a tiny client wrapper that calls `gameStore.discoverSection("home")` on
      click, on top of its unchanged `href`/styling/content. Not gated on Game
      Mode — see the note below on why discovery already isn't.
- [x] **About → Player Profile.** [about.tsx](src/components/sections/about.tsx)
      now accepts an optional `experiences` prop (passed from
      [(site)/page.tsx](<src/app/(site)/page.tsx>), which already fetches
      them) and renders `playerLevel()` from `career.ts` as a small
      level/progress strip above the existing prose grid — real dates in,
      nothing invented, and it renders nothing at all when there isn't enough
      experience data to derive a level. Existing stats grid untouched.
- [x] **Skills → Infinite Skill World.** Interaction already existed
      (`tech-chain.tsx`, `skill-card.tsx`); opening a card already called
      `gameStore.viewSkill(id)`. Done this session: the default caption now
      reads "discover" instead of "see"
      ([tech-chain.tsx](src/components/skills/tech-chain.tsx)), and
      [skill-card.tsx](src/components/skills/skill-card.tsx) gained an
      unconditional, decorative "Discovered" tag (aria-hidden — the category
      label already carries the real information) — opening the card *is*
      the discovery, so there's no state to diff for it.
- [x] **Experience → Career Progression Map.** Rail already existed
      (`ScrollProgressLine`). Done this session:
      [experience.tsx](src/components/sections/experience.tsx)'s current-role
      rail node now gets the same `animate-ping` "you are here" ring the
      Hero's availability dot uses — one motif reused, not a second one
      invented. Deliberately did **not** rename "Current" or add "checkpoint"
      copy to the text itself: the existing badge is exactly what a recruiter
      needs to read at a glance, and the brief is explicit that professional
      content must never be obscured by game vocabulary.
- [x] **Projects → Mission Levels.** Opening a case study already called
      `gameStore.viewProject(id)` via
      [project-view-tracker.tsx](src/components/game/project-view-tracker.tsx).
      Done this session: [project-status.ts](src/lib/utils/project-status.ts)
      gained `missionScope()` (a "Focused/Standard/Extensive mission" badge
      derived from tech-stack size — explicitly *not* called "difficulty",
      since a tech count can't honestly measure that), and
      [project-card.tsx](src/components/projects/project-card.tsx) now shows
      that badge plus the existing `projectStatus()` as two small `Badge`s.
      No heading or description was renamed — the mission framing is additive
      flavor, not a replacement for "Projects."
- [x] **Contact → Final Quest.** Done this session:
      [contact-form.tsx](src/components/contact/contact-form.tsx)'s success
      state now renders through `Reveal` instead of a bare `div` (its
      scroll-triggered fade fires immediately since the form is already on
      screen when it swaps in) and gained a decorative "Quest complete"
      `label-mono` line above the real "Message sent" text.

### Phase 4 — Interactive enhancements
- [x] **HUD** — [game-hud.tsx](src/components/game/game-hud.tsx). Level, XP
      bar, current-section "quest" label. Visible only in Game Mode, hidden
      below `sm`, `pointer-events-none` so it never intercepts a click.
- [x] **Achievement popups** — reuses `ToastProvider`; new `"achievement"`
      variant added in [ui/toast.tsx](src/components/ui/toast.tsx) (Trophy
      icon, `text-warning` accent). Fired from
      [game-progress-tracker.tsx](src/components/game/game-progress-tracker.tsx),
      which also seeds "already seen" from the first snapshot so a returning
      visitor's past unlocks never re-announce themselves.
- [x] **Section discovery** — `GameProgressTracker` piggybacks on the
      existing `useActiveSection` scroll-spy instead of a second
      `IntersectionObserver`.
- [x] **Game Mode toggle** —
      [game-mode-toggle.tsx](src/components/game/game-mode-toggle.tsx),
      mounted in [site-header.tsx](src/components/layout/site-header.tsx)
      next to `ThemeToggle`, and now also in
      [mobile-menu.tsx](src/components/layout/mobile-menu.tsx)'s panel next
      to the existing "Theme" row.
- [x] Project level interactions — `missionScope()` + `projectStatus()`
      badges on `ProjectCard`, covered under Phase 3 / Projects above.
- [x] Infinite skill progression — left as-is (already infinite/seamless via
      the marquee); the "collected" affordance landed on `SkillCard` instead,
      covered under Phase 3 / Skills above.

### Phase 5 — Advanced Game Mode (only after Phase 3 is stable)
- [x] **Hero → 3D "core" scene.** New
      [hero-core.tsx](src/components/game/hero-core.tsx) +
      [hero-core-scene.tsx](src/components/game/hero-core-scene.tsx): a
      react-three-fiber wireframe sphere, tilted ring and seeded dust cloud,
      positioned decoratively behind the Hero on `lg`+ screens. Built entirely
      on the pre-existing `lib/experience/*` layer rather than new plumbing:
      `useSceneBudget()` sizes segments/particles/dpr per device tier and
      collapses particles to 0 under reduced motion, `useSceneActive()` stops
      the render loop (`frameloop="never"`) when the Hero scrolls off-screen
      or the tab is backgrounded, `usePointer()` drives a slow tilt toward the
      cursor, `useCssColors()` pulls the scene's colour straight from the
      Hero's own `--tone`/`--tone-soft` tokens so a theme change moves the 3D
      scene with it, and `sphericalCloud()` seeds the dust deterministically
      so it never pops on re-render. Gated on `mode === "game"` *before*
      anything else: the `next/dynamic(..., { ssr: false })` import of the
      scene module is only requested once that check passes, so `three` and
      `@react-three/fiber` never enter a Normal Mode bundle. Wrapped in a
      small error boundary — the core is decoration, so a WebGL failure
      renders nothing rather than taking the Hero down. `aria-hidden` and
      `pointer-events-none` throughout; no lights (unlit materials only) to
      keep it cheap even on the `low` tier.
- [x] **Skills → Skill Galaxy.** New
      [skill-galaxy.tsx](src/components/skills/skill-galaxy.tsx) +
      [skill-galaxy-scene.tsx](src/components/skills/skill-galaxy-scene.tsx),
      mounted in [skills.tsx](src/components/sections/skills.tsx) *below* the
      existing `TechChain` — additive, not a replacement: the chain still
      renders every technology exactly as before, in Normal Mode and Game
      Mode alike. This is a further, opt-in layer on top, behind two gates
      rather than one: `mode !== "game"` hides the "Explore the stack in 3D"
      toggle entirely, and the `next/dynamic(..., { ssr: false })` import of
      the scene module only fires once that toggle is actually clicked — so
      neither a Normal Mode visitor nor a Game Mode visitor who never opens it
      pays anything for `three`. Reuses the same `lib/experience/*` layer as
      the Hero core (`useSceneBudget`, `usePointer`, `useSceneActive`,
      `useCssColors` scoped to `[data-tone="stack"]`) plus a small
      error boundary. Nodes sit on a deterministic Fibonacci-sphere lattice
      (not `sphericalCloud()` — that's for formless dust, this is
      individually-clickable content) and scale by each skill's real
      `proficiency` field, so "bigger star" means something instead of being
      decoration. The device budget's `galaxyNodes` caps *only* this 3D view
      on weak hardware — the always-visible chain above has no such limit —
      and the toggle row says so in real numbers ("Showing 22 of 31") rather
      than silently truncating. Clicking a node calls the same
      `gameStore.viewSkill(id)` the 2D card already calls, so progress and
      achievements stay unified across both views. Because canvas clicks
      aren't keyboard-reachable, an `sr-only` list of real `<button>`s
      (one per visible node, same `select()` handler) ships alongside the
      canvas so keyboard and screen-reader visitors who open this view get
      equivalent functionality, not an inert scene.

---

## 3. New files created this session

```
src/lib/types/game.ts
src/lib/game/game-config.ts
src/lib/game/xp.ts
src/lib/game/achievements.ts
src/lib/store/game-store.ts
src/lib/hooks/use-game-progress.ts
src/components/game/game-progress-tracker.tsx
src/components/game/game-mode-toggle.tsx
src/components/game/game-hud.tsx
src/components/game/project-view-tracker.tsx
src/components/game/start-adventure-link.tsx
src/components/game/hero-core.tsx
src/components/game/hero-core-scene.tsx
src/components/skills/skill-galaxy.tsx
src/components/skills/skill-galaxy-scene.tsx
```

## 4. Existing files edited this session

```
src/components/ui/toast.tsx                    — "achievement" variant
src/components/skills/tech-chain.tsx            — viewSkill() on open; caption copy
src/components/layout/site-header.tsx           — mounts GameModeToggle
src/app/(site)/layout.tsx                       — mounts Tracker + HUD
src/app/(site)/projects/[slug]/page.tsx         — mounts ProjectViewTracker
src/components/sections/hero.tsx                — Status line + StartAdventureLink CTA
src/components/sections/about.tsx               — Player Profile strip (playerLevel())
src/app/(site)/page.tsx                         — passes experiences to About
src/components/skills/skill-card.tsx            — decorative "Discovered" tag
src/components/sections/experience.tsx          — animate-ping "you are here" ring
src/lib/utils/project-status.ts                 — missionScope() + labels
src/components/projects/project-card.tsx        — status/scope badge row
src/components/contact/contact-form.tsx         — Reveal + "Quest complete" line
src/components/layout/mobile-menu.tsx           — mounts GameModeToggle (mobile)
src/components/sections/hero.tsx                — mounts HeroCore (further edit beyond Phase 3's)
src/components/sections/skills.tsx              — mounts SkillGalaxy below TechChain
```

All of the above are additive: nothing was rewritten, no existing prop, class
name, or content changed meaning. `npx tsc --noEmit` (after `next typegen`)
is clean on every file touched; the only pre-existing errors in the tree are
in unrelated, already-broken uncommitted work
(`components/admin/analytics/*`, `animation-toggles.tsx`, `ripple-toggle.tsx`,
`settings-form.tsx`) that this task did not touch and is out of scope for it.

---

## 5. Non-negotiables (apply to every phase)

- Reuse `variants.ts` / `springs.ts` / the existing primitives before adding
  any new animation code.
- Everything new respects `useMotionPreference()`.
- Game Mode off ⇒ zero behavioural change to Normal Mode, zero extra bytes
  beyond the toggle button and the (inert) tracker.
- No fabricated numbers about the developer — only about the visitor's own
  exploration, or derived from real content (`career.ts`, `project-status.ts`).
- No new state library, no new animation library, no canvas work outside a
  dynamically-imported Phase 5.
- Every interactive addition is a real `<button>`/`<a>`, keyboard reachable,
  with a visible focus state — HUD and toasts are `aria-live`/non-blocking,
  never the only channel for information that also exists as text.
