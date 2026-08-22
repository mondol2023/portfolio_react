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

- [ ] Time-travel tunnel: self-drawing centre line, glitching dates, cards sliding in,
      background shifting per era, particles accelerating with scroll velocity.
- [ ] 3D tilt cards (reuse `TiltCard`) and magnetic buttons.
- [ ] Click expands a role into a modal scene.

### Projects — "PROJECT ARCADE"

- [ ] Floating cartridges / 3D cards: NAME, TECH STACK, DESCRIPTION, STATUS,
      `[ PLAY PROJECT ]`.
- [ ] Hover: 3D rotate, internal parallax, glow, particles.
- [ ] Click expands the card while the others move away.
- [ ] **Animated browser-window preview** — simulated loading, floating tech badges, a
      live cursor. Never a static screenshot.

---

## Pass 4 — Contact, Footer & polish

### Contact — "OPEN A TRANSMISSION"

- [ ] Terminal boot: `ESTABLISHING CONNECTION…` → `READY TO RECEIVE TRANSMISSION.`
- [ ] Progressive form, animated labels, focus-reactive borders, sound-wave typing visual.
- [ ] TRANSMIT button that charges, then a success state.

### Footer

- [ ] Animated planet, `SYSTEM STATUS: ONLINE`, magnetic social icons.

### Polish

- [ ] Section transitions that differ from one another — no repeated fade-ins.
- [ ] Lazy loading / Suspense / dynamic imports audited across every scene.
- [ ] Reduced-motion and low-tier passes over the whole page.
- [ ] Keyboard walk-through of the entire experience; visible focus everywhere.
- [ ] Mobile pass: heavy scenes simplified, interactivity kept.

---

## Game Mode

Already present and kept: `PLAY` button → mini-game selector → Neon Snake and
Whack-a-Mole under `/play`, with `GAME OVER / SCORE / [ PLAY AGAIN ] [ RETURN TO
PORTFOLIO ]`. Revisit during Pass 4 polish so its shell matches the rebuilt sections.

---

## Known issues

- [ ] `react-hooks/immutability` error at `src/components/admin/analytics/share-donut.tsx:39`
      (`offset -= percent`). Pre-existing, committed, unrelated to this work — it fails
      `npm run lint` repo-wide until fixed.
