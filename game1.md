# Game Portfolio — Build Plan

The portfolio is being rebuilt as an interactive, game-like experience: 2D cinematic UI
motion, 3D Three.js environments, scroll-driven storytelling, and physics-inspired
micro-interactions. Every section gets its own visual identity, animation system and
interactive behaviour — no section is a card that fades in.

This file is the running plan. Items are ticked as they land, so it doubles as a map of
where each piece of the experience lives.

---

## Ground rules (apply to every pass)

- **Library division.** Motion (`motion/react`) for text, stagger, layout, buttons, cards,
  modals, springs and page transitions. Three.js / R3F for environments, particles and
  cameras. GSAP only for complex ScrollTrigger timelines. Never three libraries for one
  effect.
- **No hardcoded hex.** Colours come from the CSS tokens in `globals.css`; WebGL reads them
  through `useCssColors`.
- **The budget decides the size.** Particle counts and geometry detail come from
  `useSceneBudget`, never from the scene. A weak device gets the same scene with less in
  it — never a different one.
- **Reduced motion builds the world and holds it still.** It is not a switch that deletes
  the experience.
- **Animation logic stays out of content logic.** Reusable hooks and config objects; no
  giant components; no prop drilling.
- **Every mouse-only effect has a keyboard path**, and every canvas has readable DOM
  behind or beside it.

---

## Shared foundation

Mostly built in Pass 1, reused by everything after it. Add a row here whenever a
pass extracts something the next one will want.

| Piece | Location |
| --- | --- |
| Spring vocabulary | `src/lib/experience/springs.ts` |
| Device tiers / scene budget | `src/lib/experience/device-tier.ts`, `use-scene-budget.ts` |
| CSS token → WebGL colour bridge | `src/lib/experience/use-css-colors.ts` |
| Pointer in NDC (ref, not state) | `src/lib/experience/use-pointer.ts` |
| Seeded randomness for scatters | `src/lib/experience/random.ts` |
| Scramble/glitch text engine | `src/lib/experience/use-scramble.ts` |
| Magnetic hover | `src/components/experience/magnetic.tsx` |
| 3D tilt surface + depth layers | `src/components/experience/tilt-card.tsx` |
| Scene run gate (in view + tab focused) | `src/lib/experience/use-scene-active.ts` |
| Hand-rolled focus trap (for non-`<dialog>` modals) | `src/lib/hooks/use-focus-trap.ts` |
| Smoothed scroll velocity (motion value, not state) | `src/lib/experience/use-scroll-velocity.ts` |
| Self-drawing rail, caller places it | `src/components/motion/scroll-progress-line.tsx` (`railClassName` prop) |
| Project status derived from `liveUrl`/`endDate` | `src/lib/utils/project-status.ts` |
| Per-section scroll entrance/exit, six shapes | `src/components/motion/scroll-veil.tsx` (`variant` prop, mapped from tone in `sections/section.tsx`) |
| Typing → sound-wave amplitude | `src/lib/experience/use-typing-pulse.ts` |
| Social marks as one shared SVG set | `src/components/ui/social-icon.tsx` |
| Game-mode chrome (scope, exit, score, panel, action) | `src/components/play/arcade-chrome.tsx` |
| Per-skill-category hue, shared by WebGL and CSS | `src/lib/constants/skill-palette.ts` + `--skill-*` on `[data-tone="stack"]`, `.skill-chip` in `globals.css` |

---

## Pass 1 — Foundation ✅

- [x] **Boot loader** — dark screen, 0→100%, glitching logo, system messages
      (`INITIALIZING SYSTEM…` → `READY.`), animates *out* rather than disappearing.
      `src/components/experience/loader/boot-loader.tsx`
- [x] **Custom cursor** — centre dot plus trailing ring, spring interpolation, distinct
      states for buttons / links / projects / 3D objects.
      `src/components/experience/cursor/`
- [x] **Navigation** — floating dock, minimal until hover, animated active indicator,
      magnetic pull, animated section travel rather than jumps.
- [x] **Smooth scroll + progress rail** — Lenis, thin futuristic indicator that fills and
      names the current section. `src/components/experience/scroll/`
- [x] **Hero — "Enter the digital world"** — floating platform in fog, holographic core
      that answers the pointer, dust field, starfield, pointer parallax on camera *and*
      counter-parallax on the copy. `src/components/experience/hero/`
- [x] **`[ ENTER WORLD ]`** — spring compression on click, camera dash forward, then
      travel to the next section. Bridged to the canvas by a window event so the button
      never imports Three.js.
- [x] **Reusable animation hooks and config** — the shared-foundation table above.
- [x] Lint, typecheck and production build green.

---

## Pass 2 — About & Skills 🔄

### About — "PLAYER PROFILE"

- [x] `TiltCard` / `TiltLayer` — reusable 3D tilt surface with depth layers
      (`src/components/experience/tilt-card.tsx`).
- [x] `HudShell` — pointer-tracked spotlight and scan-line sweep, measured against the
      panel rather than the viewport.
- [x] `HudPanel` — bracketed panels that slide in from different directions.
- [x] `StatCounter` — numbers that count up when scrolled into view; parses admin-entered
      strings (`12+`, `5 yrs`, `~40%`) so any value still animates.
- [x] `LevelMeter` — animated LEVEL and XP bar, derived from real career dates rather than
      invented.
- [x] `PlayerCard` — holographic identity card: PLAYER, CLASS, status, tilt + parallax
      layers.
- [x] Rewrite `src/components/sections/about.tsx` to compose the HUD (stays a server
      component).

### Skills — "SKILL UNIVERSE"

- [x] `galaxy-layout.ts` — category orbits, node placement, budget-aware culling.
- [x] `galaxy-scene.tsx` — R3F galaxy: skill planets on category orbits, drag to rotate
      with inertia, hover grows and emits, click focuses the camera and dims the rest.
- [x] `skill-universe.tsx` — mount point: lazy scene import, visibility/tab pausing,
      selection state, detail panel, and the keyboard-reachable skill list.
- [x] Mode toggle — Universe (3D) ↔ Chain (the existing 2D infinite conveyor,
      `src/components/skills/tech-chain.tsx`). Reduced motion and low-tier devices default
      to Chain.
- [x] Rewrite `src/components/sections/skills.tsx`.

### Close-out

- [x] Lint, typecheck, production build. Green: the only remaining `npm run lint`
      failure is the pre-existing `share-donut.tsx:39` immutability error (admin
      analytics, untouched by these passes).
- [ ] Review checkpoint with the user.

---

## Pass 3 — Experience & Projects

### Experience — "THE TIMELINE MACHINE"

- [x] Time-travel tunnel: self-drawing centre line, glitching dates, cards sliding in,
      background shifting per era, particles accelerating with scroll velocity.
      `src/components/experience/timeline/`
- [x] 3D tilt cards (reuse `TiltCard`) and magnetic buttons.
- [x] Click expands a role into a modal scene.

### Projects — "PROJECT ARCADE"

- [x] Floating cartridges / 3D cards: NAME, TECH STACK, DESCRIPTION, STATUS,
      `[ PLAY PROJECT ]`. `src/components/experience/arcade/`
- [x] Hover: 3D rotate, internal parallax (reuse `TiltCard`), glow (reuse `TiltCard`
      `glare`), particles (shared `ArcadeCanvas` background, not one canvas per card).
- [x] Click expands the card while the others move away — `layoutId` shared-element
      morph from `Cartridge` into `ExpandedCartridge`, siblings fade/scale back.
- [x] **Animated browser-window preview** — simulated loading, floating tech badges, a
      live cursor. Never a static screenshot. `browser-preview.tsx`

### Review fixes

Caught reviewing the pass, all landed:

- [x] **Overlay escaped its section.** `ExpandedCartridge` is `position: fixed`, but
      every section sits inside `ScrollVeil`, which animates `y` — a transformed
      ancestor becomes the containing block for fixed descendants, so the scrim and
      panel were pinned to the section box and scrolled with it. Now portalled into
      `<body>`. Anything `fixed` added inside a `Section` from here on has the same
      problem; `<dialog>.showModal()` (as `RoleScene` uses) is immune.
- [x] **Focus was dropped on close.** Selecting a cartridge unmounts it, so the focus
      trap had no trigger to return to. The restored cartridge claims focus itself
      (`restoreFocus`).
- [x] **Rail missed its markers on mobile.** The rail was centred at every breakpoint
      while the row nodes only move to the centre at `md`. `position="center"` replaced
      by `railClassName`, so the caller places both with the same classes.
- [x] **The glitch was never seen.** `ScrambleText` resolved on mount, i.e. while the
      section was still off screen. It now takes an `active` prop, driven by the era
      the reader has actually reached.
- [x] Ring brightness damps instead of stepping; particle field opts out of a stale
      frustum-cull box; spark burst maps the pointer through the canvas rect rather
      than the window; browser preview animates the cursor on a transform instead of
      `left`/`top`, and its badges wait for the loading bar.

### Close-out

- [x] Lint, typecheck, production build. Green: the only remaining `npm run lint`
      failure is the pre-existing `share-donut.tsx:39` immutability error (admin
      analytics, untouched by these passes).
- [ ] Review checkpoint with the user.

---

## Pass 4 — Contact, Footer & polish

### Contact — "OPEN A TRANSMISSION"

`src/components/experience/transmission/`

- [x] Terminal boot: `ESTABLISHING CONNECTION…` → `READY TO RECEIVE TRANSMISSION.`
      `terminal-boot.tsx`. The reduced-motion log is *derived* in render, not written
      by the effect — setting it there tripped `react-hooks/set-state-in-effect`.
- [x] Progressive form, animated labels, focus-reactive borders, sound-wave typing
      visual. `transmission-form.tsx` + `wave-form.tsx`; amplitude comes from
      `use-typing-pulse.ts`, which decays on its own so a paused typist quiets the bars
      rather than freezing them mid-height.
- [x] TRANSMIT button that charges, then a success state. `transmit-button.tsx`.
- [x] The email address stays a plain link beside the form. A form that fails for any
      reason must never be the only way to reach someone.

### Footer

`src/components/experience/footer/`

- [x] Animated planet — wireframe globe, tilted ring, one orbiting satellite, the same
      dust as the hero. `planet-scene.tsx` / `planet-canvas.tsx`.
- [x] `SYSTEM STATUS: ONLINE` — `system-status.tsx`. It reports something true: the
      readout only claims ONLINE once the page has actually hydrated, and says STATIC
      before that (and forever, for anyone who never gets JavaScript).
- [x] Magnetic social icons — `magnetic-socials.tsx`, sharing `ui/social-icon.tsx` with
      the non-interactive copy in the contact panel so the two rows cannot drift apart.

### Polish

- [x] **Section transitions that differ from one another.** `ScrollVeil` grew a
      `variant` (`fade` / `rise` / `expand` / `tilt` / `settle` / `zoom`), mapped from
      each section's tone in `section.tsx`. Only `y`, `scale` and `rotateX` vary:
      nothing in the app sets `overflow-x: hidden`, so any horizontal travel would have
      given the whole document a scrollbar.
- [x] **Lazy loading / dynamic imports audited across every scene.** All five scenes now
      use the same pair — `next/dynamic({ssr:false, loading: () => null})` plus
      `useSceneActive`. `hero-canvas.tsx` was the last holdout, carrying a hand-rolled
      copy of the hook that predated it.
- [x] **Reduced-motion and low-tier passes.** Every `repeat: Infinity` consults
      `useMotionPreference`, every `useFrame` guards on `still`, `useSceneBudget` already
      applies `stillBudget()` itself, and the skills universe falls back to the Chain
      view on low tier. Nothing is deleted under reduced motion — it holds still.
- [x] **Keyboard walk-through; visible focus everywhere.** `SkipLink` is rendered,
      `:focus-visible` is global in `globals.css`, `input.tsx`'s `focus:outline-none` is
      paired with a visible ring, no `onClick` sits on a non-interactive element, and
      every mouse-only effect (magnet, tilt, spark burst) is decoration over a control
      that still works from the keyboard.
- [x] **Mobile pass.** The footer planet is not rendered at all below `sm` — a
      `display: none` canvas still builds a WebGL context and holds it for the life of
      the page, which on a phone is a real context bought for something nobody can see.
      `classify()` already caps coarse-pointer/narrow devices at the `low` budget.

---

## Game Mode

Already present and kept: `PLAY` button → mini-game selector → Neon Snake and
Whack-a-Mole under `/play`, with `GAME OVER / SCORE / [ PLAY AGAIN ] [ RETURN TO
PORTFOLIO ]`.

- [x] Shell rebuilt in the same language as the rest of the site:
      `src/components/play/arcade-chrome.tsx` (`ArcadeScope`, `ArcadeExit`,
      `ArcadeScore`, `ArcadePanel`, `ArcadeAction`, `ArcadeActionLink`), applied to
      `game-overlay.tsx`, the whack-a-mole chrome and `/play` (now a cabinet select).
- [x] `[ RETURN TO PORTFOLIO ]` added beside `[ PLAY AGAIN ]`, which the spec called for
      and the overlay did not have.
- [x] Game logic untouched: `lifecycle-controls.ts` binds one delegated `document`
      listener by `closest('#id')`, so the markup could change freely as long as
      `play-btn` / `resume-btn` / `restart-btn` / `pause-btn` survived. `ArcadeAction`
      spreads every button prop to guarantee that.

### Close-out

- [x] Lint, typecheck, production build. Green: `tsc --noEmit` clean, `next build` clean,
      and the only remaining lint *error* repo-wide is the pre-existing
      `share-donut.tsx:39` one (admin analytics, untouched by these passes).
- [x] `use-typing-pulse.ts` caught by the repo-wide sweep: a `useCallback` RAF loop that
      scheduled itself read its own binding before declaration
      (`react-hooks/immutability`). The loop is now a hoisted function declaration inside
      `bump`.
- [ ] Review checkpoint with the user.

---

## Known issues

- [ ] `react-hooks/immutability` error at `src/components/admin/analytics/share-donut.tsx:39`
      (`offset -= percent`). Pre-existing, committed, unrelated to this work — it fails
      `npm run lint` repo-wide until fixed.
- [ ] `react-hooks/incompatible-library` warning at
      `src/components/experience/transmission/transmission-form.tsx:97` (`watch()`).
      A React Compiler skip notice inherent to React Hook Form, which the repo already
      uses elsewhere — a warning, not a failure.
