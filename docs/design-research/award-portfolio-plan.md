# Award-portfolio research → plan → prompt

Research pass over six creative-developer portfolios, a synthesis of what
actually repeats across them, a phased plan for this codebase specifically,
and a ready-to-use prompt for executing each later phase. This file is the
single source of truth for the work — nothing in this plan is implemented by
editing existing components in place; every phase below lands as new,
isolated files that plug into the admin-toggle system this codebase already
has (`src/components/surprise/`), so the public site never changes look
until an admin switches something on.

**Status:** Phase 0 is implemented (see [What shipped in this pass](#what-shipped-in-this-pass)).
Phases 1–3 are specified but not built — hand the relevant section to an
agent (or do it yourself) when you're ready for each one.

---

## 1. Site-by-site notes

Two of the six (Richard Ekwonye, Samsy) are canvas/WebGL single-page apps
that render almost nothing into the initial HTML — a text-only fetch of the
page sees a title and a couple of stray numbers, not the experience. Rather
than invent specifics I can't confirm, those two are described at the level
of "what this genre of site is known for," flagged as such. The other four
returned enough server-rendered content to describe concretely.

### Dave Holloway — daveholloway.uk
- **Structure:** Home / Work / Lab / Site — a small, purposeful nav rather
  than a mega-menu. "Lab" separates experiments from client work, which is a
  useful pattern on its own (a low-stakes place to try things).
- **Stack signals:** GSAP, Three.js, Astro, Motion.page — confirms the
  animation is scroll-driven (GSAP ScrollTrigger idiom) layered over a small
  number of full-viewport WebGL moments, not WebGL everywhere.
- **Positioning:** "Award-winning freelance creative developer" — case
  studies lead with the outcome, not the tech.

### Richard Ekwonye — richardekwonye.com *(inferred — canvas-rendered app)*
- Single name, a year-stamped "Portfolio ©2026," and a bare `0 0` counter is
  all that reaches the DOM — everything else is drawn on canvas after load.
  That shape (name, one line, a counter, then silence) is itself a data
  point: the entire first impression is typography and a number, no
  navigation visible until the visitor acts.
- This genre typically pairs that with: a full-bleed WebGL background
  (shader gradient or particle field) that reacts to pointer position, a
  custom cursor, and a percentage-style preloader — the `0 0` is very likely
  the tail end of a "00 → 100" counter.

### Noth — noth.in
- **Structure:** sticky header → hero with an animated 3D object carousel →
  a five-project grid → an editorial "studio" section → team → footer.
- **Palette:** near-black on near-white, with saturated accent bursts
  (pink, metallic blue) confined to the product renders rather than the UI
  chrome — the interface itself stays two-tone.
- **Graphics:** glossy 3D product renders (balloons, foil, bubble wrap) as
  the entire visual identity — the "luxe" feeling comes from photoreal
  materials, not from UI decoration.
- **Motion:** auto-playing hero carousel, staggered text reveals entering
  the studio section, hover states that swap a plain thumbnail for a caption
  overlay.

### Matthew Encina — matthewencina.com
- **Structure:** nav (Work / About / Speaking / Musings / Resources /
  Contact) → hero built from stacked single-word statements ("Designer,"
  "Maker," "Storyteller") → a value-prop line → CTA → a "Highlights" strip
  with an explicit `Scroll` affordance.
- **Typography:** the whole hero *is* typography — no hero image, the words
  themselves are sized and staged as the graphic.
- **Motion:** the stacked words strongly imply a sequential reveal (each
  word animates in on its own beat, not all at once) — this is the single
  most reusable idea for a developer-portfolio hero that doesn't want to
  build a 3D scene.

### Karolina Hess — karolinahess.com
- **Structure:** two-link nav (Works / About), a hero tagline ("I design
  with care"), and a "Play Reel" moment as the primary CTA instead of a
  button that says "View work."
- **Built in Framer** — reinforces that the *effect* (parallax reveal,
  cursor-aware hover, staggered entrance) matters more than the tool; none
  of it requires a framework switch to reproduce by hand.
- **Motion:** reel-as-CTA is worth naming as its own pattern — a single
  looping video/clip standing in for a hero image, with a play affordance
  overlaid rather than autoplaying with sound.

### Samsy — samsy.ninja *(inferred — canvas-rendered app)*
- Page title only: "Award Winning Creative Graphics Engineer" — again a
  fully client-drawn experience. Sites in this exact bracket (submitted to
  "best Three.js portfolio" roundups) are reliably built around one
  continuous WebGL scene the whole page scrolls through, a loader that
  blocks first paint until assets are ready, and interaction limited to
  camera drift on pointer move rather than clickable 3D objects.

---

## 2. What actually repeats

Filtering for patterns that show up in **three or more** of the six (the bar
for "this is a genre convention, not one designer's taste"):

| Pattern | Seen at | Cost to build without new deps |
|---|---|---|
| Custom cursor (dot/ring, inverts over content) | Ekwonye*, Encina, Noth, Samsy* | Low — DOM + CSS, no library |
| Kinetic type reveal (words/lines stage in on entrance) | Encina, Noth, Holloway | Low — CSS + `IntersectionObserver` |
| Scroll-triggered staggered reveals | Holloway, Noth, Hess | Low — same mechanism as above |
| Full-bleed generative/WebGL backdrop | Ekwonye*, Samsy*, Holloway (Lab) | High — this codebase already has one (Living River) |
| Grain / noise overlay for a "filmic" surface | Genre-wide convention; implied by Noth's gradient overlays | **Already shipped** — `film-grain.ts` |
| Reel/video-as-hero-CTA | Hess | Medium — needs an asset, not just code |
| Preloader / percentage counter before first paint | Ekwonye*, Samsy* | Medium — real cost is perceived-performance risk, see §4 |
| Minimal two-tone palette, colour reserved for imagery | Noth, Ekwonye* | N/A — this site already runs a warm-neutral + single-accent system |

`*` = inferred from genre convention, not confirmed by page content.

Two things on that list are **already true of this codebase** and don't need
new work: the accent-reserved-for-content palette discipline (`globals.css`'s
`--tone`/`--tone-soft` per-section system already does this), and film grain
(`src/components/surprise/effects/film-grain.ts` is already in the
catalog). The plan below only covers the gap.

---

## 3. Fit against this codebase

This repo already has the right shape of system for absorbing this kind of
work cheaply: `src/components/surprise/` is a registry of small,
self-contained "effects" (`SurpriseEffect`, see
[`effect.ts`](../../src/components/surprise/effect.ts)) that each declare a
`channel` (what part of the page they own), know how to turn themselves on,
and know how to put the page back exactly as found. Anything added to
`effects/index.ts` automatically:

1. gets a real on/off switch in the admin dashboard's "Site animations"
   panel (`AnimationToggles` derives its rows from the registry — no admin
   UI code to write), and
2. becomes eligible for the surprise button's random draws, and
3. is already live on every page, because `<SiteAnimations />` (mounted in
   [`src/app/(site)/layout.tsx`](../../src/app/(site)/layout.tsx)) reads
   whatever's pinned in Firestore and mounts it.

That means most of what these six sites do — custom cursor, kinetic type,
scroll reveals, grain — belongs in that registry as new effects, not as a
parallel system. The one item on the list that *doesn't* fit the registry is
the full-bleed generative backdrop, because this site already has one of
those (Living River / painted river, its own dedicated toggle) and a second
would compete for the same visual real estate — see the reasoning already
written into
[`scenery-toggle.tsx`](../../src/components/admin/scenery-toggle.tsx).

**Explicitly out of scope**, and why:
- **A blocking preloader / percentage counter.** Every one of these sites
  pays for its intro with a delayed first paint. That's a real trade a
  designer-led studio site can make; it's a bad trade for a portfolio meant
  to also read well as a fast, crawlable Next.js site (this codebase already
  invests in `sitemap.ts`, `robots.ts`, OG images — undermining that with an
  artificial delay is a regression, not a feature).
- **Adding a new animation library** (GSAP, Lenis, Framer Motion beyond the
  `motion` package already installed). Every existing effect is hand-rolled
  `requestAnimationFrame` + vanilla DOM, on purpose — it keeps the surprise
  bundle tiny and dependency-free. The reveals and easing these sites use
  don't need more than that.

---

## 4. Phased plan

Each phase is one or two new files, following the exact shape of an existing
effect (see `cursor-trail.ts` / `spotlight.ts` for the pattern: an
`injectStyle` call, an optional `mountLayer`, a `start()` that returns its
own cleanup). None of them touch an existing effect file.

### Phase 0 — Magnetic-style custom cursor · **shipped in this pass**
New file: `src/components/surprise/effects/magnetic-cursor.ts`, registered
in `effects/index.ts`. A dot glued to the pointer plus an eased ring that
grows a notch over anything clickable, both in `mix-blend-mode: difference`
so it reads correctly in light or dark mode with no theme-aware code. Fine
pointer only — it declines to mount at all on touch. See
[What shipped in this pass](#what-shipped-in-this-pass) for how to turn it
on.

### Phase 1 — Kinetic hero reveal
The Encina/Noth/Holloway pattern: on first paint, the hero's headline
splits into words (or lines) and stages them in with a short delay between
each, rather than the whole block fading in at once.

- **New file:** `src/components/motion/kinetic-heading.tsx` (this is a real
  React component, not a `SurpriseEffect` — it needs to *replace* how a
  heading renders, not just restyle an existing one, so it can't be a
  drive-by `injectStyle`).
- Wrap each word in its own `<span>` at render time (server-safe: pure
  string splitting, no client JS needed to produce the markup), then a small
  client component staggers `opacity`/`translateY` per span using CSS
  custom properties (`--i: <index>`) and a single shared `@keyframes`, so N
  words cost one animation declaration, not N.
- Respect `useMotionPreference()` — under reduced motion the words render
  at their final position with no stagger, immediately.
- Wire-up: import `<KineticHeading>` in the hero section
  (`src/components/sections/`, wherever the H1 currently lives) as an
  **opt-in** replacement for the plain heading, gated behind a new boolean
  in `SiteSettings` (mirroring the exact pattern `livingRiverEnabled`
  already uses end-to-end: type → Zod schema → repository → server action →
  a dedicated admin toggle). This one earns a dedicated toggle rather than a
  registry entry because — like the river — it's a layout decision (the H1
  itself changes shape), not an overlay.

### Phase 2 — Scroll-staged section reveals
The Holloway/Noth/Hess pattern applied to project cards and section
headings: elements animate in only once they cross into the viewport,
staggered by list position.

- **New file:** `src/components/motion/reveal-on-scroll.tsx` — a thin
  wrapper using `IntersectionObserver` (already the idiom this codebase
  reaches for; see `use-motion-preference.ts` for the house style of
  small, dependency-free hooks) that adds a `data-revealed` attribute once,
  then disconnects. CSS in `globals.css`'s existing "section tones" block
  handles the actual transition (`opacity`/`translateY` on
  `[data-reveal]:not([data-revealed])`).
- Apply it to the existing project grid and skills list — no new visual
  design, just sequencing what's already there. Ships as a straight
  component change (not admin-gated), since it's a quality-of-motion
  improvement in the same spirit as `float-headings.ts`'s existing "you
  notice the page is alive without pointing at what's doing it" philosophy,
  and — unlike Phase 1 — doesn't change what the content *is*.

### Phase 3 — Project-card hover preview
The Noth pattern: hovering a project card swaps its static thumbnail for a
short looping clip or a second image, with a caption sliding over it.

- Needs asset work first (a short clip or a second image per project) —
  this is a content dependency, not just code, so it should follow whichever
  projects the admin actually wants this treatment on.
- Implementation is a CSS-only crossfade (`:hover` toggling `opacity` on a
  stacked `<video muted loop playsinline>` / `<img>` pair) inside the
  existing project-card component — no JS needed beyond what autoplay-muted
  video already requires.

---

## 5. Prompt — for executing Phase 1, 2, or 3 later

Paste the block below (with the bracketed phase swapped in) to brief an
agent on a fresh session, or use it as a personal checklist. It encodes the
constraints this plan already settled so they don't have to be
re-litigated per phase.

```
Implement [Phase 1 — the kinetic hero reveal] from
docs/design-research/award-portfolio-plan.md in this repo.

Hard constraints, non-negotiable:
- No new npm dependencies. Hand-roll with CSS + IntersectionObserver +
  requestAnimationFrame, matching the existing style in
  src/components/surprise/effects/*.ts and src/lib/hooks/use-motion-preference.ts.
- Every animated thing must degrade correctly under `useMotionPreference()`
  (prefers-reduced-motion): either skip the effect or render the end state
  immediately, never "the same animation but slower."
- If the feature is an overlay/backdrop/cursor/weather-style effect that can
  be described as "on" or "off" independent of layout: add it as a new
  SurpriseEffect in src/components/surprise/effects/, register it in
  effects/index.ts, and stop there — the admin toggle and the public-site
  wiring already exist and need no new code.
- If the feature changes layout or what content renders as (a heading that
  splits into words, a card that needs a second asset): it is NOT a
  SurpriseEffect. Give it its own component, gate it behind a new boolean on
  SiteSettings following the exact chain scenery-actions.ts /
  scenery-repository.ts / scenery-toggle.tsx already use for
  `livingRiverEnabled`, end to end.
- New code goes in new files. Do not rewrite an existing effect, hook, or
  section component in place — extend by adding, not by editing what's
  already load-bearing for the current site.
- Match the comment voice already in this codebase: explain *why* a
  decision was made (the trade-off, the thing it avoids), not just what the
  code does line by line.
- Run `npm run lint` and `npm run typecheck` before calling it done.

Then update docs/design-research/award-portfolio-plan.md: move the phase
you just built from "Phased plan" into a dated entry under
"What shipped in this pass," the same way Phase 0 is recorded there.
```

---

## What shipped in this pass

**Phase 0 — magnetic-style custom cursor**, as a new `SurpriseEffect`:

- [`src/components/surprise/effects/magnetic-cursor.ts`](../../src/components/surprise/effects/magnetic-cursor.ts) —
  the effect itself. A dot pinned to the real pointer position plus an eased
  ring (same "chase a fraction of the remaining distance, park when settled"
  loop `spotlight.ts` and `cursor-trail.ts` already use), both rendered in
  `mix-blend-mode: difference` so one pair of shapes reads on any
  background. The ring grows a notch over anything matching
  `a, button, [role="button"], input, textarea, select, summary`. Declines
  to mount at all when `(pointer: fine)` doesn't match, so touch visitors
  see nothing different. Movement-only, so it's dropped for anyone with
  `prefers-reduced-motion` set, same as every other `animated: true` effect.
- [`src/components/surprise/effects/index.ts`](../../src/components/surprise/effects/index.ts) —
  the one-line registration. This is the "final file" that wires the new
  effect to the rest of the site: adding it here is what makes it appear in
  the admin toggle list *and* eligible for the surprise button, because both
  of those already read this registry.

**No other file changed.** The public site's default look is unaffected
until an admin turns it on.

### Turning it on
1. Sign in to `/admin`.
2. Open the dashboard (`/admin`) and find the **Site animations** panel.
3. Under **Follows the pointer**, switch on **Magnetic cursor**.
4. It's live for every visitor immediately — no deploy needed, no code
   change. Turn it back off the same way at any time.

It can also turn up on its own as part of a Surprise-button draw, same as
any other cursor effect, for anyone who hasn't pinned something else in
that lane.

### QA checklist for this phase (and a template for the next ones)
- [x] `npm run lint` — clean.
- [x] `npm run typecheck` — clean (the only errors reported belong to the
      unrelated `my-clone/` scaffold in this repo and predate this change).
- [ ] Manual: toggle on in `/admin`, confirm the dot/ring appear on the
      public site and the ring grows over links and buttons.
- [ ] Manual: enable "reduce motion" at the OS level, confirm the cursor
      effect does not mount at all.
- [ ] Manual: test on a touch device or with dev-tools touch emulation,
      confirm the native cursor and default touch behaviour are untouched.
- [ ] Manual: toggle off, confirm the native cursor returns immediately
      with no leftover DOM (`document.querySelector('[data-surprise="magnetic-cursor"]')`
      should be `null`).
