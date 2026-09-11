# Section Scenery — 3D/motion planning for a distinct animation per section

Status: **implemented** — see "What shipped" at the bottom. Revised 2026-09-08 after a
second reference pass and a closer read of the code; §2.4, §4, §5 and §6 carry
corrections that overturn parts of the first draft. Companion to [3D-SCENE-CONCEPT.md](../../3D-SCENE-CONCEPT.md)
(the River Path day-cycle backdrop — implemented, currently unmounted, see §2) and
[docs/design-research/award-portfolio-plan.md](award-portfolio-plan.md) (Phase 0
shipped, Phases 1–3 specified). This document does not repeat what those two
already cover — it starts from a fresh reference pass, names the specific gap
in the current site, and plans closing it.

---

## 1. What was studied this pass, and what to steal

Five sites, picked for how each treats motion/3D/interactivity. Revisited on a
second pass (2026-09-08); four of the five returned enough to describe
concretely this time. `unfor-dev.vercel.app` still does not: it ships a single
`<h1>` ("Unfor's Portfolio") and draws everything else into a canvas, so a text
fetch sees nothing of the experience — the same limitation `award-portfolio-plan.md`
already flagged for Ekwonye/Samsy. It stays flagged as inferred rather than
being written up as if it had been read.

| Site | Core technique | What to borrow | What to avoid |
|---|---|---|---|
| [schemeengine.com](https://www.schemeengine.com/) | Confirmed: a full-viewport generative canvas driven by a live **shader control panel** — a "Time Speed" slider (1.0×) with pause/reset, plus **seven** colour slots each with independent H/S/L **and alpha** | Not the editor UI (an internal-tool affordance, wrong for a portfolio) — the **architecture underneath it**: one renderer, many looks, purely by swapping a parameter set. Two specifics worth copying literally: a **per-scene speed multiplier**, and giving each scene a small **palette of several related swatches with their own alphas**, not one flat accent colour | Exposing controls to the visitor — our "parameters" are chosen by which section is on screen, never user-twiddled |
| [noth.in](https://www.noth.in/) | Confirmed: monochrome black/white chrome with all saturation spent on glossy 3D object renders (balloons, foil, bubble wrap). Work tiles carry thumbnail + title + tagline + an "Explore" indicator. The phrase "we are nothin'" runs as a **repeating kinetic marquee** with corrupted glyphs | The **hover-swap-content pattern** for project cards (this is exactly Phase 3 in `award-portfolio-plan.md`, specified but unbuilt — this plan revives it) and the discipline of spending saturation only on the content, never the UI chrome | Rebuilding the kinetic marquee — `globals.css` already has `.marquee`/`.marquee-track` with a reduced-motion fallback that unwraps the loop into a static row. If a kinetic-text moment is wanted, it is already there |
| [ricardochance.com](https://www.ricardochance.com/?ref=threejsresources) *(self-description, not observed motion)* | States the approach directly: "sequential animations, pinned sections, parallax, and 3D integration — designed to guide attention and keep people engaged," and "motion is part of the design language — not an afterthought." GLSL shaders for "transitions, distortions, particle systems, and post-processing" | The **pinned-section-with-payoff** idea — a section holds still for a beat while its scenery finishes a move, then releases — already partly present in this codebase (`ScrollVeil`, `Stagger`), worth being more deliberate about per scenery module | Marketing-copy vagueness — there is no confirmed easing/timing to copy here, only the *shape* of the technique |
| [unfor-dev.vercel.app](https://unfor-dev.vercel.app/?ref=threejsresources) *(inferred — canvas app, "my work" section)* | Genre convention for a `threejsresources`-listed portfolio: one continuous WebGL scene the whole page is drawn into, project entries as objects/planes in that scene rather than DOM cards, camera moves to a project on selection instead of a route change | The **camera-moves-to-content** feeling, reproduced without WebGL: a scenery module that visibly "arrives" at the Work section (see §4) rather than just fading in, so selecting a project reads as arriving somewhere, not opening a modal | Full-WebGL implementation — this codebase's standing rule (`award-portfolio-plan.md` §3) is no new animation/3D library, and this plan does not need one to get the feeling |
| [cosmos.studio](https://cosmos.studio) | Dark-dominant agency site: infinitely-looping awards carousel, project cards that swap to a cover image on hover, stat counters that count up once they enter the viewport | The **count-up-on-entry** micro-interaction (cheap, `IntersectionObserver` + a number tween, no new dependency) as a candidate for an Experience-section "years/projects shipped" stat if one exists, and the continuous-marquee-loop technique as one candidate *primitive* for the shared engine (§3) | The card-grid-first structure — this site's Work section is already a grid with its own established `ProjectCard`/`project-gallery` components; scenery augments it, it doesn't replace it |

Common thread: **one engine, many parameter sets** (schemeengine.com) is the
technique that makes "each section's scenery is different" tractable without
six bespoke renderers — see §3.

---

## 2. What's already true of this codebase — the actual gap

This is not a blank canvas. Three things already exist and this plan reuses
all three rather than duplicating them:

1. **A per-section colour identity already exists and already spans light/dark.**
   [`section-tone.ts`](../../src/lib/constants/section-tone.ts) names six tones
   — `hero`, `about`, `stack`, `work`, `experience`, `contact` — set via
   `data-tone` on each `<Section>`. `globals.css` already defines a light *and*
   dark `--tone`/`--tone-soft` pair per tone (`[data-tone="hero"]` vs.
   `.dark [data-tone="hero"]`, etc. — six pairs, twelve rules total, already
   shipped). **This plan's light/dark requirement is already solved at the
   token layer** — every new scenery module should read `--tone`/`--tone-soft`
   rather than inventing its own colours, the same way `ambient-background.tsx`
   already does.

2. **A shared "which section is the reader looking at" signal already exists.**
   [`ambient-background.tsx`](../../src/components/layout/ambient-background.tsx)
   runs an `IntersectionObserver` over every `[data-tone-anchor]` section with
   a `rootMargin` collapsed to the middle 10% of the viewport, and cross-fades
   `--tone`/`--tone-soft` to whichever section is under the reader's eyeline.
   **The gap is exactly here**: today, that observer only *retints* one shared
   set of shapes (three blobs + light-mode rays + dark-mode stars). Six
   sections, one animation, six colours. The user's ask — "make each section's
   scenery different animation" — means the observer should pick a
   *different scenery module*, not just a different colour, per section.

3. **A "build it as its own thing, wire it in one place" pattern already exists,
   twice.** [`river-scenery/`](../../src/features/river-scenery/) and
   [`living-river/`](../../src/features/living-river/) are both full-page
   backdrops, each self-contained in its own folder, each mounted by exactly
   one line in [`app/(site)/layout.tsx`](../../src/app/(site)/layout.tsx) —
   and both are **currently commented out** there (lines 60–61), so the site
   presently ships with no full-scene backdrop at all, only `AmbientBackground`.
   This plan's "do the work in a separate file, then wire it to the main file"
   instruction is not new guidance for this codebase — it is the house style,
   already demonstrated twice, and §6 below follows the identical shape: new
   files under a new feature folder, a single import + a single line changed
   in `ambient-background.tsx` (not `layout.tsx` — see §6) to switch it on.

Also already available for reuse, not to be reinvented:
`src/components/surprise/effect.ts`'s `injectStyle`/`mountLayer`/`fadeIn`/
`randomOf`/`between`/`LAYER` DOM helpers; `useMotionPreference()` for reduced
motion; the Bangladeshi motif vocabulary already designed (and, for four of
them, already coded) in `3D-SCENE-CONCEPT.md` §3 — paddy stalks, nakshi-kantha
stitching, fireflies, the recurring red-disc sun/moon.

### 2.4 Corrections to the first draft

Four claims in the first draft did not survive reading the code. They are
corrected here rather than quietly edited away, because each one changes what
gets built:

1. **`river-path`'s layers cannot be imported into a canvas engine — the first
   draft was wrong.** `river-path/layer.ts` defines `RiverLayer` as
   `{ css: string; mount(root: HTMLElement): void }` — a DOM-and-stylesheet
   contract. `night-accents.ts` builds `<i class="rp-star">` elements styled by
   selectors scoped to `[data-surprise="river-path"]`, animated by a CSS
   keyframe, coloured by the `RIVER_CREAM` constant, and faded by river-path's
   own `--t` scroll variable. There is no drawing function to call and nothing
   to hand a `CanvasRenderingContext2D`. So §4's "imported, not rewritten" is
   **withdrawn**: the *motifs* (fireflies, stars, stitching) carry over, the
   *code* cannot. The new engine gets its own particle and stitch primitives.
   Reusing the motif was always the point; reusing the file was a mistake in
   the first draft.

2. **Reduced motion genuinely does need a JS gate — the open question in §6 is
   now closed.** `globals.css` (the `@media (prefers-reduced-motion: reduce)`
   block near the end) already stops `.ambient-blob`, `.ambient-rays` and
   `.ambient-stars` outright with `animation: none !important`, and kills
   `.ambient`'s tone transition. That is a complete answer **for CSS
   animations**, and it is invisible to a `requestAnimationFrame` loop painting
   a `<canvas>`. `SectionScenery` must therefore call `useMotionPreference()`
   and render nothing — confirmed, not assumed.

3. **The observer should be passed down, not moved.** The first draft said to
   move the `IntersectionObserver` out of `ambient-background.tsx` into the new
   feature. Reading it, that block also handles a subtle route-change case (the
   resolved tone is stored *with the pathname it came from* and compared during
   render, so a stale route's colour cannot stick). Moving that logic risks
   losing it for no gain. `AmbientBackground` already computes the exact value
   the scenery needs, so `SectionScenery` takes `tone` as a **prop** and holds
   no observer at all. Strictly less churn, one source of truth, and the
   correction the plan's own "don't duplicate the observer" rule was reaching
   for.

4. **The canvas must not parse the *interpolating* `--tone`.** `--tone` is a
   registered `@property` with `syntax: "<color>"` mid-way through a 900ms
   transition for most of the time that matters, and a registered colour
   interpolates in oklab — so `getComputedStyle(.ambient).getPropertyValue("--tone")`
   can hand back an `oklab(…)` string, not the `rgb()` the first draft assumed.
   Instead the engine reads all six tones **once**, from a throwaway probe
   element that carries `data-tone` but no transition (`transition` is not an
   inherited property, so a child of `.ambient` does not inherit its 900ms
   rule) — every read is then the stylesheet's own sRGB value. The cross-fade
   between two sections' colours is done by the canvas itself, in JS, over the
   same duration.

---

## 3. Core concept: one scenery engine, six scenes

> Replace `AmbientBackground`'s single retinted shape-set with a **Section
> Scenery** registry: one small shared canvas/CSS engine (the schemeengine.com
> lesson — one renderer, many parameter sets) that exposes a handful of
> reusable *primitives* (drifting particles, connecting lines, a swaying-stalk
> field, a stitched path, a wave band), and six *scene definitions* — one per
> `SectionTone` — each a short config picking which primitives run, at what
> density, and reading colour from that section's already-defined `--tone`.
> The existing `IntersectionObserver` in `ambient-background.tsx` keeps
> choosing "which section is current" exactly as it does today; the only
> change is that it now swaps *which scene renders*, not just *which colour
> a fixed scene uses*.

Why an engine-plus-configs rather than six independent files with their own
`requestAnimationFrame` loops: six loops means six places to get the reduced-
motion check, the visibility-pause, and the DPR/perf-scaling logic right (or
wrong). One loop, driven by whichever scene config is active, means that
plumbing is written once — in the same spirit as `living-river/core/clock.ts`
already clamping `dt` and pausing on `document.hidden` for its one loop.

---

## 4. Per-section scenes

Each motif is chosen to (a) read as visibly different from its neighbours at
a glance — different silhouette, different motion, not just a different hue —
and (b) reuse the Bangladeshi visual vocabulary this site has already
committed to in `3D-SCENE-CONCEPT.md`, so this reads as one project's
continuing identity, not a genre pastiche bolted on top.

| Section (`tone`) | Scene | Primitives used | Motion | Reference borrowed from |
|---|---|---|---|---|
| `hero` | **Dawn water** | `wave-band` + `glow-disc` (a low sun), over the existing `ambient-blob`s, which stay — the opening screen should be calm, not busy | Slow horizontal swell; the disc bobs almost imperceptibly | Baseline restraint — Encina/Hess's "the words are the graphic," per `award-portfolio-plan.md` |
| `about` | **Paddy field** | `stalk-field` — a batched canvas field, one path per stalk, no per-particle state beyond phase | Wind sway with a travelling gust; stalks are distributed with a bias toward the right of the frame, so the field visibly thickens as the eye crosses the bio | `3D-SCENE-CONCEPT.md` §3 (paddy motif), spec'd there, never built as a section scenery |
| `stack` | **Constellation** | `constellation` — drifting nodes, edges drawn between any pair within a link radius | Nodes drift on independent slow paths; a vertical "signal" band sweeps the graph and brightens the edges it passes, so the motion reads as *the stack is connected*, not as random noise | schemeengine.com's parametrised-particle idea, retargeted from decorative to legible |
| `work` | **Arrival** | `perspective-rails` — rails radiating from a vanishing point plus depth rings rushing toward the viewer | The one scene with a genuine **one-shot**: rings arrive fast on entry and decelerate into a slow idle, so the section reads as *arriving somewhere* rather than fading in. Deliberately settles, so it stops competing with the project grid | unfor-dev.vercel.app's camera-moves-to-content feeling, reproduced without WebGL (§1) |
| `work` (cards) | **Hover reveal** *(component-level, not a scenery primitive — see §6)* | swap static thumbnail → second image/caption on hover | CSS crossfade only | noth.in — this is `award-portfolio-plan.md` Phase 3, revived here since it directly supports "work" reading as distinct |
| `experience` | **Stitched thread** | `stitched-path` (dashed running-stitch threads) + `drift-particles` in rain configuration | Each thread draws itself left→right on entry, then the stitches travel along it via `lineDashOffset`; fine rain drifts across (the "monsoon = challenges weathered" reading already established) | `3D-SCENE-CONCEPT.md` §4's Experience row — spec'd, unbuilt |
| `contact` | **Night settle** | `drift-particles` in firefly configuration + `glow-disc` (the same disc as `hero`, now a high moon) | The one scene whose motion **decays**: particles start drifting and settle to near-still, the calmest thing on the page, matching "a quiet close." The recurring disc closes the loop the hero opened | `3D-SCENE-CONCEPT.md` §4's Contact row |

Six silhouettes, deliberately chosen to be distinguishable at a glance with the
colour taken away: horizontal swell, vertical growth, scattered graph,
converging depth, dashed threads, rising points. That test — *would these still
look different in greyscale?* — is what makes this "a different animation per
section" rather than six tints of one.

Note the correction in §2.4: `experience` and `contact` reuse the *motifs* from
`river-scenery/river-path/`, but not its code — `RiverLayer` is a DOM/CSS
contract with nothing a canvas can call.

---

## 5. Light/dark handling

No JavaScript theme branching anywhere in this feature — the same rule
`ambient-background.tsx` and every `river-path` layer already follow:

- Every scene reads colour from `--tone` / `--tone-soft` (already themed —
  see §2.1). A scene file never hard-codes a hex value.
- Where a scene needs a light-only or dark-only accent (stars only at night,
  light shafts only in daylight — exactly `ambient-rays` / `ambient-stars`
  today), both variants stay mounted and CSS opacity-switches them via
  `.dark`, matching the existing comment in `ambient-background.tsx`: *"nothing
  here has to read the theme — which also means no wrong-mode flash on
  hydration."* `next-themes` writes `.dark` on `<html>` before hydration
  (`theme-provider.tsx`), so this is safe.
- Canvas-drawn primitives never sample the live, interpolating `--tone` — see
  §2.4.4 for why that string is not reliably parseable. `engine/tone-color.ts`
  reads **all six tones at once** off a transition-free probe element and
  caches them, so a scene is handed a plain `{ tone, soft, softAlpha }` palette
  in sRGB and contains no colour logic of its own. The cache is re-read when
  `next-themes` flips `.dark` on `<html>`, watched with a `MutationObserver`.
  That is the feature's *only* theme read, it happens after hydration, and it
  changes colour values rather than branching behaviour — so there is still no
  wrong-mode flash and no second code path.
- The cross-fade between two sections' scenery is done by the engine, not by
  CSS: the outgoing scene keeps painting at a falling alpha while the incoming
  one rises, over ~700ms. Two scenes are alive at once only during that window.
  A hard cut would land badly against the 900ms colour cross-fade already
  running underneath in `globals.css`.

---

## 6. Technical architecture — files, then wiring

Following the exact shape `river-scenery/` and `living-river/` already
demonstrate (§2.3): everything new lives in one feature folder, nothing
existing is rewritten, and exactly one file changes to switch it on.

```
src/features/section-scenery/
├── README.md                  # why this folder exists, house style
├── engine/
│   ├── scene.ts                # the `Scene` contract — { resize(w,h), frame(f) } — the
│   │                             #   `SceneFrame` a scene is handed, `composeScene`, easings
│   ├── tone-color.ts            # reads all six tones once off a transition-free probe
│   │                             #   (§2.4.4), watches `.dark`, exposes `rgba()`
│   └── loop.ts                  # the single rAF loop: dt clamp, visibility pause,
│                                  #   DPR/quality scaling, and the scene cross-fade
├── primitives/
│   ├── wave-band.ts              # hero swell
│   ├── glow-disc.ts              # the recurring sun/moon — hero and contact
│   ├── stalk-field.ts            # about's paddy sway
│   ├── constellation.ts          # stack's node/edge graph
│   ├── perspective-rails.ts      # work's arrival
│   ├── stitched-path.ts          # experience's nakshi-kantha running stitch
│   └── drift-particles.ts        # one primitive, two configurations: rain and fireflies
├── scenes/
│   ├── hero-scene.ts … contact-scene.ts   # one per §4 row — each just composes primitives
│   └── index.ts                  # `SCENES: Record<SectionTone, SceneFactory>`
└── section-scenery.tsx           # the ONE "use client" component: takes `tone` as a prop,
                                   #   looks it up in SCENES, drives engine/loop.ts
```

**The one wiring change**: `ambient-background.tsx` renders
`<SectionScenery tone={tone} />` **alongside** its existing
`ambient-blob`/`ambient-rays`/`ambient-stars` divs, not in place of them — the
blobs are the tone wash every scene sits on, and §4 calls for `hero` staying
close to today's calm look. Per §2.4.3 the `IntersectionObserver` **stays where
it is**; `AmbientBackground` already resolves the tone and simply hands it
down. `app/(site)/layout.tsx` does not change at all, and neither does
`globals.css` — the canvas is positioned with Tailwind utilities so that
deleting the feature folder and one line is genuinely the whole removal.

**Card-level hover reveal** (§4's "work (cards)" row) is a separate, smaller
piece of work against `src/components/projects/project-card.tsx` directly —
it is component-level, not a `Scene`, so it does not belong in
`section-scenery/` at all. Keep it a distinct, separately-committable change.

**Reduced motion**: resolved in §2.4.2 — the existing `globals.css` rules cover
the CSS layers and cannot cover a canvas, so `SectionScenery` calls
`useMotionPreference()` and returns `null`, mounting no canvas and starting no
loop. The page then falls back to exactly today's look. No admin toggle in v1:
this is the site's baseline backdrop, like `AmbientBackground`, not an opt-in
surprise effect that the dashboard or the surprise button can roll.

---

## 7. Interactivity carried over from the reference pass

- **Hover reveal on work cards** — noth.in, §4, §6.
- **Count-up stat on viewport entry** — cosmos.studio — only if the
  Experience or About section ends up with a numeric stat (years shipped,
  projects count); if not, this is dropped rather than inventing content to
  justify the micro-interaction. Cheap to add later regardless:
  `IntersectionObserver` + a `requestAnimationFrame` number tween, no new
  dependency, same shape as `reveal-on-scroll.tsx` already planned in
  `award-portfolio-plan.md` Phase 2.
- **Pinned-section payoff** — ricardochance.com's "pin, then release" idea
  is already partially present via `ScrollVeil`; §4's "work" scene's one-shot
  resolve-then-idle is this plan's concrete instance of it, scoped to one
  section rather than a whole new scroll-pinning system.

---

## 8. Guardrails (inherited, not renegotiated)

Same non-negotiables `3D-SCENE-CONCEPT.md` §7 and `award-portfolio-plan.md`
§3 already established for this codebase — repeated here because this plan
must be held to them too, not because they're new:

- **No new npm dependencies.** Hand-rolled `<canvas>` + `requestAnimationFrame`
  + CSS only, matching every existing effect in this repo. No Three.js,
  react-three-fiber, GSAP, or a second motion runtime alongside `motion`.
- **`prefers-reduced-motion` disables scenes outright**, never "the same
  animation, slower" — falls back to each section's static `--tone`/
  `--tone-soft` wash with no primitives mounted (i.e., today's baseline look).
- **Content-first.** Every section is fully readable with `SectionScenery`
  deleted — it's `aria-hidden`, `pointer-events: none`, purely decorative,
  exactly like `AmbientBackground` today.
- **New code in new files.** No existing scene/effect/section component is
  rewritten in place; `ambient-background.tsx` gets the one wiring change
  described in §6 and nothing else in the repo changes.
- **Perf budget carries over from `living-river`**: canvas draw calls batched
  (one `InstancedMesh`-equivalent path per primitive type, never per-particle
  draw calls), DPR/quality scaling under the same `engine/loop.ts` that also
  owns the visibility-pause and `dt` clamp.

---

## 9. Build prompt

Paste this to brief an agent on a fresh session, or use it as a personal
checklist. It encodes every decision this document already made so they
aren't re-litigated mid-implementation.

```
Build "Section Scenery" from docs/design-research/section-scenery-3d-plan.md
in this repo — a distinct, hand-rolled animated backdrop per public section
(hero/about/stack/work/experience/contact), replacing the single shared,
merely-retinted shape-set that src/components/layout/ambient-background.tsx
renders today.

Read first, in this order, before writing any code:
1. docs/design-research/section-scenery-3d-plan.md (this plan — §2 for what
   already exists and must be reused, §4 for the six per-section scene specs,
   §6 for the exact file layout and the one-line wiring change).
2. src/components/layout/ambient-background.tsx — the IntersectionObserver
   block that decides "which section is current" STAYS THERE (see §2.4.3); the
   resolved tone is passed down to <SectionScenery tone={tone} /> as a prop.
3. src/lib/constants/section-tone.ts and the `[data-tone="…"]` /
   `.dark [data-tone="…"]` rules in src/app/globals.css — every new scene
   reads colour from the already-themed `--tone`/`--tone-soft` custom
   properties. Do not hard-code a single hex value anywhere in this feature.
4. 3D-SCENE-CONCEPT.md §3 for the motif vocabulary (paddy, nakshi-kantha
   stitching, fireflies, the recurring sun/moon disc). Do NOT try to import
   river-scenery/river-path/night-accents.ts — §2.4.1 explains why it is
   structurally impossible; carry the motif, write the canvas primitive.
5. src/components/surprise/effect.ts — reuse its DOM helpers
   (injectStyle/mountLayer/fadeIn/LAYER) and src/lib/hooks/use-motion-preference.ts
   for the reduced-motion gate, rather than re-inventing either.

Hard constraints, non-negotiable:
- No new npm dependencies. No Three.js/react-three-fiber/GSAP. Canvas2D +
  CSS + requestAnimationFrame only, matching the existing living-river and
  river-scenery features' house style.
- Build every new file under a new src/features/section-scenery/ folder
  exactly as laid out in this plan's §6 — engine/, primitives/, scenes/,
  and one top-level section-scenery.tsx that composes them. Do NOT edit
  ambient-background.tsx, layout.tsx, or any section component until every
  new file is written and typechecks; the wiring step is the LAST step, is
  exactly one file (ambient-background.tsx), and is exactly the change
  described in this plan's §6 — no other file changes as part of wiring.
- Every scene must read --tone/--tone-soft for colour (light and dark both
  covered for free — see §5) and must be skippable entirely: with
  useMotionPreference() true, SectionScenery must render nothing rather than
  a slowed-down version of itself.
- Purely decorative: aria-hidden, pointer-events: none, and the page must
  read and function identically with the entire feature folder deleted.
- One shared rAF loop (engine/loop.ts) drives whichever scene is currently
  active — do not give each scene file its own requestAnimationFrame loop.
  It must clamp dt, pause while document.hidden, and scale a quality/DPR
  factor under sustained frame cost, the same responsibilities
  living-river/core/clock.ts already has for its own loop (do not import
  from living-river directly — this is a separate, smaller loop for 2D
  canvas primitives only; match its discipline, don't share its code).
- Match the comment voice already in this codebase: explain *why* a decision
  was made (the trade-off, the thing it avoids), short and to the point —
  see any file under src/features/living-river/ or river-scenery/ for the
  target voice. Do not write line-by-line "what" comments.
- The work-card hover-reveal (plan §4/§6, "work (cards)" row) is a SEPARATE
  change against src/components/projects/project-card.tsx — do it as its own
  commit-sized unit, not folded into the section-scenery feature folder.
- Do not touch Firestore, server actions, or any repository. This feature
  has no admin toggle in v1 (it's the site's baseline backdrop, like
  AmbientBackground today, not an opt-in surprise effect) — do not add one
  unless asked.
- Run `npm run lint` and `npm run typecheck` before calling any step done.
- Update this plan's status line from "planned, not built" to "implemented"
  and add a dated "What shipped" section at the bottom, the same way
  3D-SCENE-CONCEPT.md §9 and award-portfolio-plan.md's "What shipped in this
  pass" record completed work, once the wiring step lands.

Build order:
1. engine/loop.ts, engine/tone-color.ts, engine/scene.ts (the Scene contract
   every scene implements) — no visuals yet, just the shared plumbing.
2. primitives/wave-band.ts, stalk-field.ts, constellation.ts — the three new
   primitives (stitched-path.ts and night-accents.ts are imports/thin
   wrappers around existing river-path code, not new logic).
3. scenes/*.ts — six small files, one per §4 row, each composing primitives
   with a density/speed config. No primitive logic lives here.
4. section-scenery.tsx — moves the IntersectionObserver from
   ambient-background.tsx, maps the resolved SectionTone to a scene, drives
   the shared loop.
5. Wire: ambient-background.tsx renders <SectionScenery /> — the one-line
   change this whole plan has been building toward. Confirm hero keeps (or
   deliberately simplifies) the existing ambient-blob look per §4's row for
   `hero`, since that section is called out as staying intentionally calm.
6. project-card.tsx hover-reveal, as its own separate step per the
   constraint above.
```

## 10. What shipped — 2026-09-08

Built as `src/features/section-scenery/`, wired in `ambient-background.tsx`.
`npm run typecheck` and `npm run lint` both come back clean for everything this
pass touched (the remaining findings — three `TS2307`s in `my-clone/` and five
lint warnings plus one `react-hooks/immutability` error in admin components —
are pre-existing and were not touched).

### The files

```
src/features/section-scenery/
  engine/scene.ts        Scene / SceneFrame contract, composeScene, easings
  engine/tone-color.ts   probe-based --tone / --tone-soft reads, theme watcher
  engine/loop.ts         the single rAF loop: sizing, cross-fade, frame budget
  primitives/            wave-band, glow-disc, stalk-field, constellation,
                         perspective-rails, stitched-path, drift-particles
  scenes/                six compositions + the SCENES record
  section-scenery.tsx    the client component
  README.md              the map, and the six things worth knowing
```

One edit outside the folder: `ambient-background.tsx` renders
`<SectionScenery tone={tone} />` as the first child of `.ambient`. `globals.css`,
`(site)/layout.tsx` and every section component are unchanged.

### The six scenes, and the test they pass

| Tone | Scene | Silhouette |
| --- | --- | --- |
| `hero` | low sun + slow swells | horizontal |
| `about` | a field growing out of the fold, biased right | vertical |
| `stack` | a network with a signal sweeping through it | scattered |
| `work` | rails converging, markers arriving fast then settling | converging depth |
| `experience` | threads writing themselves left to right, under rain | sequential, dashed |
| `contact` | fireflies rushing in and settling under a moon | rising points |

The bar §3 set: **turn the colour off and they are still six different things.**
Each row above is a different *shape of motion*, not a recolour of one — which is
why the primitives layer is seven pieces rather than one parameterised blob.

`hero` was kept deliberately calm per §4 — one glow disc and five slow bands, the
lowest-energy scene of the six, sitting behind the existing ambient blobs rather
than replacing them.

### Where the plan was wrong, and what was done instead

Four first-draft claims did not survive contact with the code. Recorded here so
the next pass does not re-derive them:

1. **`night-accents.ts` cannot be imported.** A `RiverLayer` is
   `{ css, mount(root) }` — it hands out DOM nodes and a stylesheet, and has
   nothing to give a `CanvasRenderingContext2D`. §9's build order called
   `stitched-path.ts` and `night-accents.ts` "thin wrappers around existing
   river-path code"; both were written from scratch as canvas primitives. The
   motifs carried over, the code did not.
2. **Reduced motion needed a JS gate after all.** The `prefers-reduced-motion`
   block in `globals.css` stops the ambient blobs, rays and stars, but a
   stylesheet cannot stop a `requestAnimationFrame` loop. `SectionScenery` calls
   `useMotionPreference()` and returns `null`.
3. **The `IntersectionObserver` stayed put.** §9 step 4 said to move it into
   `SectionScenery`. It holds the stale-route guard (tone stored with the
   pathname it came from), and a second observer on the same six anchors is a
   second chance to get that edge case wrong. The tone is passed as a prop.
4. **`--tone` must not be parsed off `.ambient`.** It is a registered
   `@property`, and registered `<color>` properties interpolate in **oklab** — a
   `getComputedStyle` read mid-transition returns `oklab(…)`, not `rgb(…)`.
   `tone-color.ts` reads the stylesheet's own sRGB values off a throwaway
   `<span>` carrying `data-tone`, which never transitions because `transition`
   is not an inherited property. Read once at mount, re-read when `.dark` flips.

## 11. Second pass — the reader enters the scene

The first pass shipped six scenes that looked identical whether or not anybody
was there. §7 listed interactivity as carried over from the reference pass but
none of it reached the canvas. This pass added it, plus the smoothing the extra
motion made necessary.

### One input layer, not six

`engine/input.ts` owns every listener: `pointermove`/`pointerdown` (passive),
`scroll` (passive, caching `scrollY` so the loop never reads it), and
`blur` + `pointerleave` to drop presence when the reader leaves. `loop.ts` calls
`input.read(dt, width, height)` **once** per frame and hands the same
`FrameInput` to the outgoing and incoming scenes; the object is reused, so a
frame allocates nothing. Six primitives with their own handlers would have been
six things competing for the main thread on every mouse move.

`PointerState` carries smoothed `x/y`, normalised `nx/ny` in −1…1, a velocity
derived from the *smoothed* point (raw deltas are far too spiky to drive
anything), and `presence` — which rises fast, falls slowly, and blends the
target between the real pointer and a noise wander after ~2.4s of stillness. A
touch reader therefore gets a backdrop that still moves; it is simply one that
nobody is steering.

### One verb per section

The greyscale test from §3 needed a companion, because six copies of "particles
drift toward the cursor" would pass it and still be one idea repeated:

| Section | Verb | How |
| --- | --- | --- |
| `hero` | **wind** | gusts follow pointer speed — fast to rise, slow to fall; near bands respond more than far ones |
| `about` | **parting** | stalks bend away, pushed in 0.12s and released over 0.55s |
| `stack` | **connection** | the pointer becomes a node and links to its neighbours; scroll velocity drives the sweep |
| `work` | **the camera** | the vanishing point tracks the pointer and the whole projection turns; scroll accelerates the markers |
| `experience` | **a pluck** | the nearest thread is pulled into a Gaussian bell and settles; the rain behind merely leans |
| `contact` | **an invitation** | fireflies are drawn in and brighten; the moon barely follows at all |

### Smoothness

Three separate fixes, all of which were visible before:

1. **Frame-rate-independent easing.** `approach(v, target, tau, dt)` =
   `v + (target − v)(1 − e^(−dt/τ))`. The `* 0.1`-per-frame idiom is a different
   curve at 60Hz and at 144Hz, which is why the first pass felt twitchy on a
   high-refresh display.
2. **Blended `dt`.** rAF delivers 15ms and 18ms gaps back to back; fed straight
   into slow wide motion that reads as tremor. The loop keeps a rolling `dt`
   (35% of each new measurement) and resets it when the tab wakes.
3. **Quadratic-midpoint curves.** Every traced line — wave bands, stitched
   threads — makes each sample a control point and each midpoint an anchor.
   Smoother *and* cheaper: sampling went from `width/120` to `width/70` on the
   bands and `width/100` to `width/64` on the threads.

The cross-fade also changed to a `smoothstep01(p)` / `smoothstep01(1 − p)` pair,
which is the only common easing pair that sums to exactly 1 — the previous
easeOutCubic pair bulged bright halfway through every section change.

### Life-likeness

Sines were replaced with seeded value noise (`engine/noise.ts`, integer hashing
via `Math.imul` and a Hermite fade). A sine repeats exactly and the eye locks
onto the period inside ten seconds; `fbm1` is two octaves with the second offset
by `* 2.17 + 11.3` so they never realign.

Attraction is an **offset that springs back to zero**, not a force — on an
undamped body (constellation nodes, stalks) a force adds energy the drift never
sheds, and the scene visibly heats up over a long visit. Fireflies are the one
exception: they damp, so they can take a real force.

### The hover reveal (§9 step 6)

Built, as its own unit against `src/components/projects/project-card.tsx` — no
part of it lives in `section-scenery/`. The card picks the first gallery frame
that is renderable *and* different from the thumbnail, and crossfades the two on
`group-hover` and `group-focus-within`. CSS only: no state, no listeners, the
card stays a server component, and the reveal image is `alt=""` so the stretched
link remains the card's single tab stop. The whole effect is behind
`motion-safe:`, so a reduced-motion reader keeps the thumbnail rather than
getting an instant swap.

### Still open

Nothing from §9. Possible next: per-scene tuning against a real device matrix —
the interaction constants were chosen on one machine.

