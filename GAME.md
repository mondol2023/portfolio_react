# Developer Quest — Gamification Plan

Status: **audit complete, foundation not started**. Companion to [PLAN.md](./PLAN.md) (the original site build, which is done — this file only covers layering a game-inspired progression system on top of it).

This file is the single source of truth for the "Developer Quest" transformation. Update the checkboxes as work lands — do not let this drift from the code.

---

## 1. Audit — what already exists

### 1.1 Stack & conventions
- Next.js 16 App Router, TypeScript strict, Tailwind v4, `motion` (Framer Motion successor, already installed as `motion/react` — **use this, do not add a second animation lib**).
- `three` is already a dependency, but only for the existing Snake game's 3D rendering (`src/components/play/whack-a-mole/creature-3d.tsx`, snake scene). Per the brief, no *new* Three.js usage.
- Firebase: client SDK (`src/lib/firebase/client.ts`) for public reads, Admin SDK (`admin.ts`) for trusted server writes, a repository layer under `src/lib/firebase/repositories/*` — components never touch Firestore directly. This pattern is strict and should be followed for anything new that needs persistence.
- Server Actions live in `src/lib/actions/*`, gated by `admin-guard.ts` for admin-only writes.

### 1.2 Section structure (`src/app/(site)/page.tsx`)
One page, six sections composed server-side, each reading its own Firestore-backed content with sample-data fallback:
`Hero → About → Skills → Projects → Experience → Contact` (`src/components/sections/*.tsx`). Section ids (`home, about, skills, projects, experience, contact`) drive both anchor nav and scroll-spy — defined once in [navigation.ts](src/lib/constants/navigation.ts).

Each section already has a distinct interaction identity (relevant to spec §17, "don't make every section fade the same way"):
- **Hero** — `Stagger`/`AnimatedText` entrance on mount, no scroll trigger (nothing above it).
- **About** — two-panel reveal + animated stat grid ([about.tsx](src/components/sections/about.tsx)).
- **Skills** — infinite marquee chain, see 1.4 below.
- **Projects** — staggered card grid, lead card gets emphasis ([projects.tsx](src/components/sections/projects.tsx)).
- **Experience** — a scroll-filled progress rail (`ScrollProgressLine`) with a two-beat reveal per role (header, then a `Curtain` slide-up for detail) ([experience.tsx](src/components/sections/experience.tsx)).
- **Contact** — direct channels + form, `exit={false}` since nothing follows it ([contact.tsx](src/components/sections/contact.tsx)).

Active section detection already exists and is reused by the header: [use-active-section.ts](src/lib/hooks/use-active-section.ts) — one shared `IntersectionObserver`, not per-section scroll listeners. **This is exactly the mechanism spec §16 asks for — reuse it for level/HUD state, do not build a second one.**

### 1.3 Navbar / HUD candidate
[site-header.tsx](src/components/layout/site-header.tsx) is a pill-shaped fixed header: wordmark, active-section-aware nav links (shared-layout active pill via `layoutId="nav-active"`), theme toggle, mobile menu. Hides on scroll-down, reappears on scroll-up ([use-scroll-direction.ts](src/lib/hooks/use-scroll-direction.ts)). Deliberately has **no admin link** — that's load-bearing, not an oversight.

### 1.4 Skills infinite chain (spec §10 — do not remove)
[tech-chain.tsx](src/components/skills/tech-chain.tsx) + [tech-marquee.tsx](src/components/skills/tech-marquee.tsx): skills are dealt round-robin into 3–4 rows, each an independent seamless-loop marquee (alternating direction), rendered via `TechMarquee`. Clicking a pill toggles a selected state and reveals detail in a caption below (name / category / proficiency / description), `aria-live="polite"`. This is a real, working infinite-loop implementation — any enhancement (hover-slows-loop, energy/glow on connections) has to be additive CSS/motion on top of `TechMarquee`, not a rewrite.

### 1.5 Play / games (spec §13 — already exists, two games)
- `PlayButton` ([play-button.tsx](src/components/play/play-button.tsx)) — fixed bottom-left pill, links to `/play`.
- `/play` ([page.tsx](src/app/play/page.tsx)) — a game-select hub, currently **2 games**: 3D Snake (`/play/snake`) and Whack-a-Mole (`/play/whack-a-mole`).
- Snake has a real engine under [src/lib/game/](src/lib/game) (`game-engine.ts`, `entities/`, `systems/collision-system.ts`, `scene/scene-manager.ts`, `input/`) — this is a proper little ECS-ish structure, not a toy. Whack-a-Mole has its own `use-whack-a-mole.ts` hook + config/creatures data.
- Neither game currently reports score/completion back to any site-wide state — they're self-contained fullscreen routes (`bg-black`, own back link). No XP/achievement hook exists yet.

### 1.6 Existing "delight" layer — surprise button & admin control
- [surprise-button.tsx](src/components/surprise/surprise-button.tsx) fires a random effect from a large catalog ([catalog.ts](src/components/surprise/catalog.ts), ~20 effects: confetti, glitch-ink, starfield, scanlines, grid-warp, etc.), each a self-contained module under `src/components/surprise/effects/`.
- [water-ripple-click.tsx](src/components/layout/water-ripple-click.tsx) — click-triggered ripple, global.
- **Both are admin-toggleable**, persisted in Firestore (`content/animations`, `content/rippleEffect` — see [collections.ts](src/lib/firebase/collections.ts)) via [animation-actions.ts](src/lib/actions/animation-actions.ts) / [ripple-actions.ts](src/lib/actions/ripple-actions.ts), surfaced in admin as [animation-toggles.tsx](src/components/admin/animation-toggles.tsx) / [ripple-toggle.tsx](src/components/admin/ripple-toggle.tsx).
- **Precedent this sets for Developer Quest**: any new global visual system (HUD, achievement popups) should probably get the same admin on/off switch, following the same repository → server action → admin toggle pattern already established twice.

### 1.7 Motion system (spec §19 — already centralized)
[src/components/motion/](src/components/motion) already *is* the "animation primitives" folder the spec asks for: `variants.ts` (shared `EASE_OUT`, `DURATION`, `createFadeVariants`, `createStaggerVariants`, `VIEWPORT`), `fade-in.tsx`, `reveal.tsx`, `stagger.tsx`, `animated-text.tsx`, plus section-specific primitives (`curtain.tsx`, `scroll-progress-line.tsx`, `scroll-veil.tsx`, `bomb-intro.tsx`, `circuit-road.tsx`). `motion-provider.tsx` + [use-motion-preference.ts](src/lib/hooks/use-motion-preference.ts) already implement `prefers-reduced-motion` handling app-wide. **New animation primitives (achievement popup, HUD bar fill, screen-shake-lite) belong here, following the existing naming and reduced-motion pattern — not a parallel folder.**

### 1.8 What does NOT exist yet (the actual gap)
- No game-state context (XP, level, achievements, visited sections, opened projects, games played).
- No HUD (level/XP indicator) in the header.
- No "level" concept mapped to sections.
- No achievement system/popup.
- No "quest discovered" / "mission complete" framing on Projects or Contact.
- No third game (Skill Match / Terminal Challenge) — Bonus Zone currently has 2, spec suggests up to 3.

### 1.9 Risks before touching anything
1. **Design tone risk (the big one).** The existing copy and code comments are deliberately restrained, editorial, "not childish", accessibility-first — e.g. Hero comment: *"Deliberately photo-free: the first screen sells the work, not a headshot."* A loud arcade HUD (`LEVEL 03 XP ███░`) risks clashing with that voice. Recommendation: keep game framing as an **optional, subtle overlay** — small level pill in the header, quiet toast-style achievement notices — never renaming visible section headings/eyebrows (they're already numbered `01 — About`, `03 — Work`, etc., which *is* the "level" numbering, just undramatized). Confirm with user before any copy changes to headings.
2. **Don't break the marquee.** The skills chain's seamless loop is sensitive to width changes (`tech-marquee.tsx` comment warns about this directly) — any "select to see detail" enhancement must stay outside the looping row, exactly as it does today.
3. **Games are separate routes, not modals.** `/play/*` are fullscreen dedicated routes (own dark background, own back button), not embedded in the scroll page. XP-for-playing has to be reported back via a client-side call into the shared game context (e.g. on unmount/game-complete), not via section visibility.
4. **Firebase discipline.** Per spec §23 and the existing pattern: XP/achievements/levels are session-only UI state (React context + `sessionStorage`, not Firestore) unless the user explicitly asks to persist them. Do not add a `players` or `achievements` Firestore collection speculatively.
5. **Admin toggle precedent.** If a global HUD is added, it should probably be admin-toggleable like animations/ripple are — confirm scope before building that extra plumbing (it roughly doubles the work: repository + action + admin UI).

---

## 2. Architecture plan

### 2.1 New game-state context
```
src/lib/game/quest/
  quest-context.tsx     # GameProvider — React Context, sessionStorage-backed
  quest-types.ts         # QuestState, Achievement, XP event shape
  quest-constants.ts     # XP values, level→section map, achievement definitions
  use-quest.ts            # useQuest() hook (state + actions: visitSection, openProject, playGame, addXp)
```
(Named `quest/` rather than reusing `src/lib/game/`, since that folder is the Snake engine's internal home — keep concerns separate.)

State shape (matches spec §5, kept flat, no over-engineering):
```ts
interface QuestState {
  currentLevel: number;        // derived from active section via SECTION_IDS index
  visitedSections: Set<string>;
  xp: number;
  achievements: Set<AchievementId>;
  openedProjects: Set<string>;  // project ids, session-scoped
  gamesPlayed: Set<"snake" | "whack-a-mole" | ...>;
  soundEnabled: boolean;        // stub only — no sound assets planned yet, see §5 in the brief
}
```
Persisted to `sessionStorage` only (not Firestore, see risk 4) — resets each browser session, which is fine for a visual progression layer.

### 2.2 HUD
`src/components/layout/game-hud.tsx` — small addition inside `site-header.tsx`, not a separate bar: a level pill + thin XP progress line, desktop only initially (mobile stays clean per spec §22), reads `useQuest()`.

### 2.3 Achievement popup
`src/components/motion/achievement-toast.tsx` (new primitive, alongside existing `reveal.tsx`/`curtain.tsx`) + `achievement-variants.ts` in the existing `variants.ts` style. Rendered from a single `<AchievementQueue>` mounted once in the root layout, driven by `useQuest()`.

### 2.4 Files to modify (light touch, additive)
- [site-header.tsx](src/components/layout/site-header.tsx) — mount `GameHud`, call `visitSection(activeSection)` on change (it already computes `activeSection`).
- [layout.tsx](src/app/(site)/layout.tsx) — wrap with `<QuestProvider>`, mount `<AchievementQueue>`.
- [projects/project-card.tsx](src/components/projects/project-card.tsx) — fire `openProject(id)` on click-through (once-per-session guard lives in context, not the component).
- [play-button.tsx](src/components/play/play-button.tsx) / game pages — report `playGame(id)` on completion.
- [contact.tsx](src/components/sections/contact.tsx) — on successful submit, `addXp` + unlock final achievement.

### 2.5 Files to leave untouched
Everything in `src/lib/firebase/`, `src/lib/actions/`, admin panel, the Snake engine internals, the surprise-effects catalog. None of this needs to change for a session-only UI progression layer.

---

## 3. Phased checklist

Mark `[x]` only once verified working (build passes, no console errors, reduced-motion respected, mobile checked).

### Phase 0 — Planning
- [x] Audit existing architecture, sections, Firebase, animation system, Play Games, skills chain (§1 above).
- [x] Write this plan file.
- [x] Confirm HUD tone (subtle pill vs. full arcade bar) and whether admin-toggle is wanted — **answered: subtle pill; admin toggle deferred until the layer exists.**

### Phase 1 — Foundation (spec Step 3)
- [x] `quest-context.tsx` / `quest-types.ts` / `quest-constants.ts` / `use-quest.ts`
- [x] Wire `QuestProvider` into the layout — **placed in the root [layout.tsx](src/app/layout.tsx), not `(site)/layout.tsx`**: `/play/*` and `/projects/[slug]` live outside the `(site)` group and still need to record progress. The provider renders no UI; the visible surfaces stay in the public shell.
- [x] `GameHud` in [site-header.tsx](src/components/layout/site-header.tsx) — level derived from the existing `useActiveSection`, no second observer. Desktop only (`lg:`), hidden until hydrated.
- [x] `AchievementQueue` + [achievement-toast.tsx](src/components/motion/achievement-toast.tsx) primitive — one card at a time, `pointer-events-none` container, auto-dismiss at 5s, manual dismiss button.
- [x] Reduced-motion pass on all new primitives (reuse `use-motion-preference`)
- [x] `tsc --noEmit` and `next build` clean. (`eslint .` reports one pre-existing error in [share-donut.tsx](src/components/admin/analytics/share-donut.tsx) and three pre-existing warnings; nothing from the new files.)

### Phase 2 — Section-by-section (spec Step 4, in order)
- [ ] Hero — "start journey" affordance wired to `addXp`/first achievement (optional, non-blocking)
- [ ] About — visit XP on scroll-into-view
- [ ] Skills — visit XP; hover-slows-marquee enhancement (additive to `tech-marquee.tsx`)
- [ ] Projects — "quest discovered" toast on first open per project, once per session
- [ ] Experience — journey-map framing pass (evaluate: existing `ScrollProgressLine` may already satisfy this without new work)
- [ ] Games — hook `gamesPlayed` from Snake + Whack-a-Mole completion; evaluate a 3rd small game
- [ ] Contact — mission-complete framing on successful submit + final achievement

### Phase 3 — Polish (spec Step 5)
- [ ] Achievement definitions finalized (5–7 max per spec §14)
- [ ] Background atmosphere pass (only if it doesn't duplicate existing `ambient-background.tsx`)

### Phase 4 — Performance & cleanup (spec Step 6)
- [ ] Verify no new scroll/resize listeners (reuse IntersectionObserver pattern)
- [ ] Verify sessionStorage read/write doesn't run on server (guard with `use-hydrated.ts`)
- [ ] Mobile check: 320/375/390/768/1024/1440
- [ ] `next build` + `tsc --noEmit` + `eslint .` clean

---

## 4. Next step

Phase 1 is in. Phase 2 next, in the spec's own order — Hero, About, Skills, Projects, Experience, Games, Contact.

Two things carried forward into Phase 2:

- **`openProject` fires on the project detail page, not the card.** [project-card.tsx](src/components/projects/project-card.tsx) is a server component using the stretched-link pattern, and it navigates away the moment it is clicked — the click handler §2.4 imagined would both force the card to become a client component and race the navigation. Recording the visit on arrival is simpler and more honest about what happened.
- **Admin toggle still deferred.** If it is wanted later it follows [ripple-toggle.tsx](src/components/admin/ripple-toggle.tsx) exactly: a `content/questMode` doc, a repository read, a server action, one dashboard switch, and a conditional mount in the shell.

---

## 5. Desktop Experience — OS-style shell (new initiative, independent of §§1–4)

Status: **Phases 1–3 built and verified; Phase 4 partly done.** This is not a continuation of the Developer Quest work above — it's a separate, larger change to the site's chrome and scroll model. The quest HUD pill and achievement toasts stay exactly as they are functionally and just got **relocated** into the new chrome (§5.6), not rebuilt.

§§5.1–5.6 below are the plan as written. Where the build diverged from it, the divergence is recorded inline and in §5.7 — the plan is left readable rather than rewritten to match the outcome.

### 5.1 The brief, expanded

> Visiting the site should feel like sitting down at a PC. The navbar becomes a taskbar pinned to the bottom of the screen. The left edge holds shortcut icons for each section, like desktop icons. Each section is its own full-screen wallpaper. Scrolling switches from one section's "desktop" to the next — closer to swiping between virtual desktops/Spaces than to scrolling a page.

Turned into requirements:
1. **Taskbar** — replaces the current top pill nav ([site-header.tsx](src/components/layout/site-header.tsx)). Pinned bottom, full width. Carries the wordmark/start affordance and every control the header currently owns (theme toggle, quest HUD pill, mobile trigger) — relocated, not redesigned.
2. **Icon dock** — fixed left edge, one icon per entry in [NAV_ITEMS](src/lib/constants/navigation.ts), stacked vertically, each labelled, the current section visibly "selected" (desktop-icon idiom — an icon with a highlight box, not a text link).
3. **Wallpaper per section** — each section's backdrop is visually distinct and full-bleed, not a strip of colour above the content.
4. **Scroll = switch** — moving between sections reads as a discrete page/desktop switch, not continuous scroll with things fading in and out.

### 5.2 What already exists that this reuses

- **The tone system is 80% of "wallpaper" already.** Every section carries `data-tone` + `data-tone-anchor` ([section.tsx](src/components/sections/section.tsx), tones defined in [section-tone.ts](src/lib/constants/section-tone.ts): `hero / about / stack / work / experience / contact`), and [ambient-background.tsx](src/components/layout/ambient-background.tsx) already runs **one** `IntersectionObserver` over a thin middle band of the viewport and cross-fades a `--tone`/`--tone-soft` CSS custom property to match whichever section is centred. A literal wallpaper layer is the same mechanism with a different visual on top — see §5.4.
- **Active-section detection for the dock/taskbar** is [use-active-section.ts](src/lib/hooks/use-active-section.ts), already shared by the header. Same rule as the quest layer (§1.2): ride the existing observer, never add a second.
- **Shared-layout active-state highlight** — `site-header.tsx`'s `layoutId="nav-active"` pill is exactly the animation the icon dock's "selected icon" needs, just laid out vertically.
- **Mobile drawer** — [mobile-menu.tsx](src/components/layout/mobile-menu.tsx) already solves focus-trap/Escape/scroll-lock correctly; the desktop-icon dock's mobile fallback should reuse it, not re-solve accessibility from scratch.
- **`useMotionPreference`** — every new animated piece (crossfade, icon selection, paging) must respect it, same as everything else in this codebase.

### 5.3 What's genuinely new

- A bottom-pinned taskbar layout (current header is top-pinned).
- A vertical icon dock (no equivalent exists — closest analogue is `PlayButton`/`SurpriseButton`, which are single floating buttons, not a labelled icon rail).
- A literal wallpaper visual per section (current `AmbientBackground` is abstract drifting colour, not a "desktop" backdrop).
- Discrete scroll paging (current scroll is continuous, with `ScrollVeil` fading sections as they leave — see [section.tsx](src/components/sections/section.tsx)).

### 5.4 Architecture — one new folder, few wires

```
src/components/desktop/
  desktop-chrome.tsx        # orchestrator: mounts Taskbar + IconDock, replaces <SiteHeader/> in the shell
  taskbar.tsx                 # bottom bar: wordmark, quest HUD, theme toggle, mobile trigger, clock
  taskbar-clock.tsx            # decorative live clock, client-only, purely cosmetic
  icon-dock.tsx                 # left vertical icon rail, one per NAV_ITEMS entry
  desktop-icon.tsx               # single icon button + shared-layout "selected" highlight
  desktop-mobile-dock.tsx         # small-screen fallback — wraps existing MobileMenu, doesn't rewrite it
  wallpapers.ts                    # SectionTone -> { light, dark } wallpaper spec (gradient/image)
  wallpaper-field.tsx               # fixed full-bleed layer, crossfades with the active tone
  use-section-paging.ts              # optional (Phase 3 only): scroll-snap container behaviour
```
Everything the concept needs lives in this one folder, per the brief. The only files outside it that change are the small number of existing mount points and offsets listed in §5.6.

**As built**, the folder is twelve files rather than nine. Three additions and one drop against the sketch:

- `desktop-config.ts` — **new, and load-bearing.** The nav ids and the tone names were never the same words (`skills`/`stack`, `projects`/`work`), so something had to hold the mapping. It also owns the icon per section, the taskbar height as both a class and a number, and `toneForSection` / `itemForSection`. Everything else in the folder reads from it, so adding a section stays a one-line change in `navigation.ts`.
- `desktop-panes.tsx` — **new.** The thin `min-h-dvh` + `snap-start` wrapper Phase 3 called for, as one component wrapping the six sections in `page.tsx`, so no section file was edited.
- `taskbar-spacer.tsx` — **new.** The taskbar is `position: fixed`; this is the strip of page it would otherwise cover. A component rather than JS body padding, so it costs nothing at runtime.
- `start-menu.tsx` — **new**, and is what `desktop-mobile-dock.tsx` was going to be. It is the taskbar's own popover listing all six sections, so it serves the mobile fallback *and* the start-button idiom with one piece. Deliberately non-modal (no focus trap, no scroll lock): it is a menu attached to a bar, not a dialog, so Escape and outside-pointerdown close it and focus is never stolen. `mobile-menu.tsx` is consequently unused — see §5.6.

### 5.5 Open decisions — confirm before Phase 1 starts (same pattern as §1.9)

**Resolved.** "The visitor should have the experience of using a computer" settled all six at once, in favour of the full metaphor: (1) paging **yes**, but `y proximity` not `mandatory`, and desktop/tablet only — see §5.7 Phase 3; (2) **gradients**, six of them, pure CSS, light+dark each; (3) dock hidden below `md:`, folded into the **start menu** rather than `MobileMenu`; (4) footer stays mounted after Contact, outside the panes; (5) HUD moved into the taskbar, toasts stay top-right and were checked against the dock — see §5.7 Phase 4; (6) both floating buttons bumped to `bottom-18`.

1. **Hard snap-paging vs. crossfade-only.** True "switch desktops" behaviour means `scroll-snap-type: y mandatory` on the scroll container and each section forced to `min-h-dvh` — a real change to the scroll model that interacts with `ScrollVeil`'s fade-on-leave and with anchor-scroll targets. Recommendation: **build Phases 1–2 first** (taskbar, dock, wallpaper crossfade on continuous scroll), get eyes on it, then decide if hard paging (Phase 3) is still wanted or if crossfade alone already reads as "different desktop per section."
2. **Wallpaper source.** Flat colour/gradient per tone (fast, no asset pipeline, matches the site's current restrained visual voice) vs. actual wallpaper-style imagery per section (more literally "PC-like," but needs art direction, licensing/generation, light+dark variants, and perf budget). Recommendation: start with gradients derived from the existing tone palette in `globals.css`; revisit with real imagery only if gradients don't read as "desktop" enough.
3. **Mobile treatment of the icon dock.** A left rail doesn't fit a phone screen. Recommendation: dock hidden below `md:`, folded into a drawer opened from the taskbar (reusing `MobileMenu`'s dialog exactly, just re-triggered from the taskbar instead of a top header).
4. **Footer.** [site-footer.tsx](src/components/layout/site-footer.tsx) doesn't map to a "desktop" metaphor. Recommendation: leave it mounted after Contact exactly as today — under crossfade-only scrolling it's just the last thing on the page; revisit only if hard paging (decision 1) ships and there's no room for it.
5. **Quest HUD / achievement toasts.** HUD pill moves from the header into the taskbar (natural "system tray" slot). Achievement toasts ([achievement-queue.tsx](src/components/layout/achievement-queue.tsx)) are currently positioned independent of the header — check they don't collide with the new bottom taskbar or left dock once those are pinned.
6. **`SurpriseButton`/`PlayButton` collide with the new taskbar.** Both are fixed at `bottom-4`/`bottom-6` today ([play-button.tsx](src/components/play/play-button.tsx), [surprise-button.tsx](src/components/surprise/surprise-button.tsx)) — a bottom taskbar sits in the same space. They need a offset bump (or a slot inside the taskbar) before Phase 1 ships, not after.

### 5.6 Files touched (necessary only — nothing else)

Planned, with what actually happened marked against each:

- **New:** everything under `src/components/desktop/` (§5.4). ✅ Twelve files, per the revised list.
- ~~**New:** `src/lib/hooks/use-section-tone.ts`~~ — **dropped, deliberately.** The extraction existed to stop `WallpaperField` standing up a second observer, but there was a cheaper answer: `DesktopChrome` already calls `useActiveSection(SECTION_IDS)` for the dock and taskbar, so it passes the result down to the wallpaper as a prop. `useActiveSection` creates one observer *per call site*, so sharing the value is what keeps the count at two — the hook would only have moved code around.
- ~~**Edit:** `ambient-background.tsx`~~ — **not needed**, follows from the above. It keeps its own observer and is untouched.
- **Edit:** [(site)/layout.tsx](src/app/(site)/layout.tsx) — ✅ `<SiteHeader>` → `<DesktopChrome name=… />` after `<SkipLink />`, plus `<TaskbarSpacer />` after the footer.
- **Edit:** [play-button.tsx](src/components/play/play-button.tsx), [surprise-button.tsx](src/components/surprise/surprise-button.tsx) — ✅ one line each, `bottom-4`/`bottom-6` → `bottom-18` (72px, clearing the 56px bar by 16px).
- **Edit, unplanned:** [(site)/page.tsx](src/app/(site)/page.tsx) — the six sections wrapped in `<DesktopPanes>`. Anticipated by Phase 3 ("a thin wrapper added in page.tsx — not by editing each section file"), so it is the planned shape, just not listed here at the time.
- **Edit, unplanned:** [hero.tsx](src/components/sections/hero.tsx) — padding made symmetric (`py-20 sm:py-28`). Its extra top padding existed to clear the fixed *top* header; left asymmetric, the hero sat visibly low in the screen it is now centred in. One line, and the only section file touched.
- **Edit, unplanned:** [achievement-queue.tsx](src/components/layout/achievement-queue.tsx) — **comment only**, no behaviour change. Its note said "below the header"; there is no header.
- **Retired, kept on disk:** [site-header.tsx](src/components/layout/site-header.tsx) **and** [mobile-menu.tsx](src/components/layout/mobile-menu.tsx). Nothing imports either one. Phase 4 originally said to delete `site-header.tsx` once that was true — **that step is struck**: the instruction for this work was "dont delete any file", so both stay exactly where they are, unreferenced. They cost nothing in the bundle (nothing imports them, so nothing pulls them in) and they remain the rollback path.
- **Untouched:** ✅ every section's internal markup except hero's one padding line, all of `src/lib/firebase/` and `src/lib/actions/`, the admin panel, the Snake/Whack-a-Mole engines, the quest context/logic (only its HUD's *mount point* moved), the surprise-effects catalog, `ambient-background.tsx`, `section.tsx` and `ScrollVeil`.

### 5.7 Phased checklist

Mark `[x]` only once verified working (build passes, no console errors, reduced-motion respected, mobile checked) — same bar as §3.

**Phase 0 — Planning**
- [x] Audit chrome, tone/wallpaper system, floating buttons, quest HUD mount point (§5.2–§5.3).
- [x] Write this plan.
- [x] Confirm the six open decisions in §5.5 — all resolved toward the full metaphor.

**Phase 1 — Chrome shell (no wallpaper yet)**
- [x] `Taskbar` replacing the `SiteHeader` mount; theme toggle, quest HUD, start button all relocated and working. It never auto-hides on scroll — a taskbar that disappears is a nav bar, not a taskbar.
- [x] `IconDock` with the six section icons, shared-layout active highlight, keyboard-reachable, `aria-current`. Placed **top-left**, not centred on the left edge, which is the desktop-icon idiom and is also why `PlayButton` (bottom-left) needed no horizontal offset — the two never share a corner.
- [x] `SurpriseButton`/`PlayButton` repositioned clear of the taskbar (decision 6): both `bottom-18`.
- [x] `next build` + `tsc --noEmit` clean; dock is `hidden md:block`, taskbar collapses to wordmark + start button + clock.

**Phase 2 — Wallpaper field**
- [x] ~~Extract `use-section-tone.ts`~~ — dropped; `DesktopChrome` shares its one `useActiveSection` call instead (§5.6). `AmbientBackground` untouched, so no regression was possible.
- [x] `WallpaperField` at `-z-[11]`, under `AmbientBackground`; six gradients, one per tone; `AnimatePresence` crossfade on section change. Both the light and dark layer are mounted and switched by `dark:` opacity rather than picking one in JS — picking would flash on hydration.
- [x] Reduced-motion: crossfade becomes an instant swap, via `useMotionPreference`.

**Phase 3 — Paging (decision 1 said yes)**
- [x] `use-section-paging.ts`: sets `scroll-snap-type: y proximity` plus inverted scroll-padding (`top: 0` / `bottom: 56px`) on `<html>`, and **restores both on unmount** so nothing leaks into `/admin` or `/play`. `min-h-dvh` + `snap-start` per pane via `<DesktopPanes>` in `page.tsx` — no section file edited.
- [x] `proximity`, not `mandatory`, and `min-h-dvh`, not `h-dvh`: a section taller than the viewport (Projects, Experience) must be scrollable through rather than clipped or fought over by the snap.
- [x] `ScrollVeil` still reads well; unchanged.
- [x] Anchor links land correctly: `scrollToSection` targets `section.closest("[data-pane]")`, and returns `false` on routes with no panes so the `<Link>` navigates normally instead.
- [x] Desktop/tablet only — `PAGING_QUERY = "(min-width: 768px) and (min-height: 640px)"`. The height clause matters: snap paging on a short laptop window is worse than no paging.

**Phase 4 — Polish & cleanup**
- [x] ~~Delete `site-header.tsx` once nothing imports it.~~ **Struck** — "dont delete any file". Both it and `mobile-menu.tsx` stay on disk, unreferenced (§5.6).
- [x] Taskbar "focused window" text — the active section's name and icon, next to the clock.
- [x] Edge map written down (risk 3): taskbar `z-50` bottom / dock `z-40` top-left / Play `bottom-18 left-4` / Surprise `bottom-18 right-4` / toasts `z-60` top-right / footer cleared by `<TaskbarSpacer/>`. Toasts vs. dock checked and clear: toasts go `sm:right-6` from 640px, the dock appears at 768px on the left.
- [x] `next build` + `tsc --noEmit` + `eslint .` — build green (13/13 static pages, Next 16.3.1 Turbopack), tsc clean, eslint's 4 findings all pre-existing and none in `src/components/desktop/`.
- [ ] Optional: launch-bounce micro-animation on icon click.
- [ ] Full responsive pass at 320/375/390/768/1024/1440 **in a real browser** — reasoned through and audited against the built CSS, not yet eyes-on.
- [ ] Eyes-on check of the reduced-motion path and of `/projects/[slug]` (chrome mounts, no panes, dock links must fall through to `/#…`).

### 5.8 Risks

1. **Paging (Phase 3) is the highest-risk, highest-payoff piece** — it changes the site's fundamental scroll model. Ship Phases 1–2 first and look at crossfade-only before committing to hard snap paging. → **Retired.** Shipped, with `proximity` rather than `mandatory` as the hedge: the snap suggests pages without ever trapping a reader inside one.
2. **Wallpaper-without-imagery risk:** gradients alone might just look like a re-skinned `AmbientBackground`, not a "PC desktop." If Phase 2 doesn't read as intended, that's the moment to revisit decision 2 with real wallpaper assets — not before. → **Still open**, and only a real look at the site can close it. The gradients are named like wallpapers (Ember Dawn, Violet Aurora, Cyan Blueprint, Rose Spotlight, Emerald Horizon, Deep Signal) and are full-bleed under the chrome, which is the strongest version of the cheap option. If it still reads as a re-skin, decision 2 reopens with imagery.
3. **Viewport-edge crowding:** taskbar, icon dock, quest HUD, achievement toasts, surprise button, and play button all now claim screen edges. Write down a z-index/spacing map once Phase 1 lands so nothing overlaps, especially at small viewport heights. → **Retired**; the map is in §5.7 Phase 4.
4. **New: two `IntersectionObserver`s is now a hard budget, not a habit.** `useActiveSection` creates one per call site, and the shell's single call in `DesktopChrome` is the only thing keeping the count where §1.2 wants it. Anything else in the shell that needs the active section takes it as a **prop** — do not call the hook again.

### 5.9 Next step

Look at it in a browser: the three unticked Phase 4 items (responsive pass, reduced motion, `/projects/[slug]`) and risk 2 all need eyes, not another build. Everything that can be verified from the terminal has been.
