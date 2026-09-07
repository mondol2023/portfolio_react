# Motion lab — pass 2: the pointer-reactive project card

Second research pass over the same six creative-developer portfolios, an
**audit of what this codebase already does** (which corrects the first pass),
and the spec for the one animation built in this pass.

Companion to [`../design-research/award-portfolio-plan.md`](../design-research/award-portfolio-plan.md),
which this file **supersedes on two points** — see §2.

---

## 1. The sites, re-checked

| Site | What the fetch actually returns | Motion worth stealing |
|---|---|---|
| [daveholloway.uk](https://daveholloway.uk/) | Home / Work / Lab / Sitemap. Stack signals in the copy itself: **GSAP** across client work, **Three.js + GSAP** in the Lab, Astro, WordPress + Bricks, Motion.page. WebP throughout. | Scroll-driven sequencing (GSAP ScrollTrigger idiom) over a small number of WebGL moments — *not* WebGL everywhere. |
| [noth.in](https://www.noth.in/) | Webflow (`cdn.prod.website-files.com`). Single page, anchored nav (`#works`, `#studio-video`, `#footer`). Near-black/near-white UI; saturated pink / electric blue / metallic **only inside the product renders**. Glossy 3D objects — balloons, foil, bubble wrap — as the entire identity. A looping "we are nothin'" text marquee. | **Hover states that make a static grid feel physical**, and colour reserved for imagery while the chrome stays two-tone. |
| [matthewencina.com](https://matthewencina.com/) | Single column. Hero is stacked one-word statements — "Designer / Maker / Storyteller" — then "I Create" as a dominant type moment. No hero image at all. An explicit `Scroll` affordance into Highlights. | Typography *is* the graphic; sequential per-word entrance. |
| [karolinahess.com](https://karolinahess.com/) | Framer. Two-link nav (Works / About). "I design with care", then **PLAY REEL** as the primary CTA instead of a "View work" button. | Reel-as-hero-CTA; the effect matters more than the tool. |
| [richardekwonye.com](https://www.richardekwonye.com/) | Genuinely empty markup: `Richard Ekwonye`, `Portfolio ©2026`, and two bare `0`s. No scripts, stylesheets, classes or `<canvas>` reach a text fetch. | Nothing verifiable. The `0 0` is almost certainly a `00 → 100` preloader counter — noted, not copied (see §3). |
| [samsy.ninja](https://samsy.ninja/) | Title only: `SMSY-Gen02 \| Award Winning Creative Graphics Engineer`. Everything else is drawn after load. | Nothing verifiable. |

Two of six are fully client-drawn and cannot be described honestly from
markup. That is itself the finding: **four of the six sites carry their whole
first impression in DOM, type and hover behaviour** — which is the tier this
codebase can compete in without a WebGL rewrite.

---

## 2. What this codebase already has (corrections to pass 1)

Before proposing anything, the existing motion layer was actually read. It is
much further along than the first plan assumed:

| Pattern | Status here | File |
|---|---|---|
| Word-by-word hero reveal | **Already shipped** | [`animated-text.tsx`](../../src/components/motion/animated-text.tsx) — per-word spans, `aria-label` keeps the string whole for screen readers |
| Scroll-triggered staggered reveals | **Already shipped** | [`reveal.tsx`](../../src/components/motion/reveal.tsx), [`stagger.tsx`](../../src/components/motion/stagger.tsx), shared `VIEWPORT = { once: true, ... }` in [`variants.ts`](../../src/components/motion/variants.ts) |
| Shared easing/duration vocabulary | **Already shipped** | `EASE_OUT`, `DURATION`, `STAGGER_STEP` in `variants.ts` |
| Text marquee | **Already shipped** | [`statement-marquee.tsx`](../../src/components/motion/statement-marquee.tsx) |
| Scroll progress + veil | **Already shipped** | [`scroll-progress-line.tsx`](../../src/components/motion/scroll-progress-line.tsx), [`scroll-veil.tsx`](../../src/components/motion/scroll-veil.tsx) |
| Full-bleed generative backdrop | **Already shipped** | `features/living-river`, `features/river-scenery` |
| Film grain | **Already shipped** | [`film-grain.ts`](../../src/components/surprise/effects/film-grain.ts) |
| Custom cursor | **Shipped last pass** | [`magnetic-cursor.ts`](../../src/components/surprise/effects/magnetic-cursor.ts) |
| **Pointer-reactive card hover** | **Missing** | ← this pass |

> **Correction.** `award-portfolio-plan.md` lists a "Phase 1 — kinetic hero
> reveal" and a "Phase 2 — scroll-staged section reveals" as unbuilt. Both
> already exist, in better shape than the plan sketched (the hero one is
> already SSR-safe and already keeps the accessible name intact). Those two
> phases are **withdrawn**, not deferred. Phase 3 — a card hover preview —
> was correctly identified but was blocked on per-project video assets.

That leaves exactly one real gap, and it is the one thing all four
readable sites do that this site does not: **the grid does not respond to the
pointer.** A project card here lifts 4px and brightens its border on hover.
Noth's cards react to *where* the pointer is, which is what makes a flat grid
read as physical objects rather than as rectangles.

---

## 3. Deliberately not built

- **A blocking preloader / percentage counter** (Ekwonye, Samsy). Every one
  of these sites buys its intro with a delayed first paint. This repo invests
  in `sitemap.ts`, `robots.ts` and OG images; an artificial delay in front of
  that is a regression dressed as a feature.
- **A second full-bleed WebGL scene.** There is already one, with its own
  dedicated toggle, for the reason written into
  [`scenery-toggle.tsx`](../../src/components/admin/scenery-toggle.tsx): two
  scenes compete for one layer.
- **A new animation library** (GSAP, Lenis). Every effect in the surprise
  registry is hand-rolled `requestAnimationFrame` + vanilla DOM so the bundle
  stays dependency-free. Nothing below needed more than that.
- **Video hover previews.** Still blocked on content, not code — it needs a
  clip per project before it is worth wiring.

---

## 4. What was built: `card-tilt`

**File:** [`src/components/surprise/effects/card-tilt.ts`](../../src/components/surprise/effects/card-tilt.ts)
**Registered in:** [`effects/index.ts`](../../src/components/surprise/effects/index.ts)
**Channel:** `flow` · **`animated: true`** · fine pointers only

Hovering a project card leans it toward the pointer in 3D, lifts it, and
sweeps a soft warm light across its surface tracking where the pointer sits.
Moving off eases it back to flat and hands the card back to its normal
Tailwind hover state.

### The decisions worth recording

- **Warm light, not a white specular.** The obvious "glare" is white at low
  alpha, which is invisible on this site's near-white surfaces and only works
  in dark mode. The sweep is instead mixed from the site's own `--accent`
  (`#c2410c` light / `#fb923c` dark) via `color-mix`, so one declaration reads
  correctly in both themes and the card looks lit *by this site* rather than by
  a generic gloss layer.
- **Custom properties, not an inline transform string.** JS writes five
  numbers (`--tilt-rx`, `--tilt-ry`, `--tilt-k`, `--tilt-gx`, `--tilt-gy`);
  the stylesheet owns the actual `transform` and `background`. Same split
  `spotlight.ts` already uses, and it means the visual design is readable in
  one CSS block instead of being assembled by string concatenation per frame.
- **The transform transition has to be cancelled.** `project-card.tsx` sets
  `transition-[border-color,box-shadow,transform] duration-300`. Per-frame
  transform writes through a 300ms transition arrive smeared and late, so the
  effect's (unlayered, therefore winning) rule narrows the transition back to
  `border-color, box-shadow` — the card keeps its shadow/border hover fade and
  loses only the transform easing it no longer needs.
- **Glare opacity is a CSS transition, not a lerp.** The custom property is
  read by `opacity`, and `opacity` is animatable — so changing the variable
  transitions for free. Only the geometry needs a frame loop.
- **Rects are read inside the frame, not in the handler.** `pointermove`
  stores coordinates and a target and requests a frame; the frame does the
  `closest()` and `getBoundingClientRect()`. Keeps layout reads out of the
  event handler and out of the browser's input path.
- **Scroll re-aims without a pointer move.** Scrolling under a held pointer
  moves the card but fires no `pointermove`, which would leave a stale tilt.
  A passive `scroll` listener re-runs the same targeting from the last known
  coordinates.
- **The loop parks itself.** Same house rule as `spotlight.ts` and
  `magnetic-cursor.ts`: once every live card has settled within a threshold,
  the effect clears its custom properties, drops the `data-card-tilt`
  attribute (and with it `will-change`), and cancels the frame. Nothing runs
  while the pointer is elsewhere on the page.
- **`will-change` is scoped to live cards only.** Applying it to every card
  permanently would hand the compositor a layer per card for the whole
  session.

### Tuning

| Constant | Value | Why |
|---|---|---|
| `MAX_TILT` | `5.5°` | Above ~7° the text on the card starts to read as distorted rather than angled. |
| `PERSPECTIVE` | `1100px` | Shallower exaggerates the far edge on the wide lead card, which is `lg:col-span-2`. |
| `LIFT` / `SCALE` | `-6px` / `+1.5%` | Slightly more than the `-translate-y-1` it replaces, since the tilt already implies depth. |
| `EASE` | `0.14` | Enough lag to read as weight; short of feeling disconnected from the pointer. |

---

## 5. Turning it on

1. Sign in to `/admin`.
2. On the dashboard, find the **Site animations** panel.
3. Under **Movement**, switch on **Card tilt**.

Live for every visitor immediately — no deploy. It can also come up on its own
in a Surprise-button draw, and because it shares the `flow` lane with
**Float headings**, the two never appear in the same draw.

## 6. QA

- [x] `npm run lint` — clean.
- [x] `npm run typecheck` — clean (the only errors belong to the unrelated
      `my-clone/` scaffold and predate this work).
- [ ] Manual: toggle on, hover the project grid — cards should lean toward the
      pointer, with the warm sweep tracking it, in both light and dark mode.
- [ ] Manual: hover a card, then scroll without moving the mouse — the tilt
      should re-aim rather than stick.
- [ ] Manual: OS "reduce motion" on — the effect should not mount at all.
- [ ] Manual: touch device / dev-tools touch emulation — nothing changes.
- [ ] Manual: toggle off — cards return to the plain Tailwind hover, and
      `document.querySelectorAll('[data-card-tilt]')` is empty.
