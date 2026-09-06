# One-Scene 3D Portfolio — Concept: "নদীর পথে" (River Path)

Status: **implemented** — see §9 Progress. Companion to [PLAN.md](PLAN.md).

This document is the output of studying four reference sites for how they treat animation, then adapting the strongest ideas into a single continuous 3D scene for this portfolio, rooted in Bangladeshi landscape and craft motifs instead of a generic sci‑fi or corporate aesthetic.

---

## 1. What was studied, and what to steal

| Site | Core technique | What to borrow | What to avoid |
|---|---|---|---|
| [peachweb.io](https://peachweb.io/) | Full-page WebGL scenes (Three.js) per section, e.g. "Adding Animations… Animating Jellyfish… Creating Sea World" loading copy, camera drifting through a 3D world instead of static hero images | Treating the **entire page as one persistent 3D world** that sections camera-move through, rather than isolated per-section canvases | Being purely decorative — their scenes sell "3D websites" as the product, ours must still read as a developer's work first |
| [gsap.com](https://gsap.com/) | Not 3D at all — but best-in-class **scroll choreography**: staggered text reveals, ScrollTrigger-pinned sections, elastic/organic easing, SVG morphing | The *timing and easing language* — use GSAP (or Framer Motion equivalents) to drive the camera path and text reveals with the same polish, even though the geometry is 3D | Copying GSAP's own visual identity (green/black, plugin branding) |
| [khaledoghli.com](https://www.khaledoghli.com/) | Cinematic WebGL portfolio: gesture-driven camera ("2-finger rotate"), a rendering-quality toggle (low/normal/high/ultimate), ambient sound with an explicit mute toggle, HUD-style overlay text | The **quality-preset pattern** (critical for a scene this ambitious to stay usable on low-end phones), the sound-on/off affordance, and cinematic camera easing on scroll | The cyberpunk/HUD visual language — swap for warm, textile, monsoon-green language |
| [tbwahakuhodo.co.jp](https://www.tbwahakuhodo.co.jp/) | Huge kinetic typography, repeating taglines and GPS coordinates as a branding motif, dark minimal palette, scroll-driven text reveals between full-bleed sections | Using a **repeating coordinate/place-name motif** as a structural device (see §3 — we reuse this with Bangladeshi place names/coordinates), and restraint: 3D geometry should serve big, confident typography, not compete with it | The monochrome starkness — this portfolio wants warmth, not a black agency mood |

Common thread across all four: **the "page" is not a stack of components, it's one environment, and scrolling moves a camera through it.** That's the brief for §2.

---

## 2. Core concept

> One continuous low-poly 3D diorama of a journey through Bangladesh — from a village riverbank at sunrise, along the water, into the density of Dhaka, and out into a starlit char (river island) at night — with the camera path doubling as the scroll path of the portfolio. Each portfolio section (Hero → About → Skills → Projects → Experience → Contact) is a fixed camera "station" along that path, so navigating the site *is* traveling the river.

This gives the animation a narrative reason to exist (a personal/cultural journey), instead of 3D-for-its-own-sake — which is the one thing PLAN.md explicitly rules out ("No animation-for-its-own-sake").

### Why a river specifically
- Bangladesh is structurally a delta — the Padma, Meghna and Jamuna rivers are the country's defining geography, and a river is a ready-made **camera spline**: it curves, narrows, widens, branches — every shape a scroll-driven dolly path needs.
- It naturally sequences moods: calm rural dawn → bustling urban midday → quiet reflective night — which maps cleanly onto Hero (arrival) → Projects (the city, density, work) → Contact (a quiet close).

---

## 3. Bangladeshi motifs used as scene content (not surface decoration)

Each motif below is chosen because it can become **actual 3D geometry, texture, or particle behavior**, not just a background image:

- **Nouka (wooden boats)** — low-poly boat silhouettes drift along the river beneath the camera in the Hero section; one boat carries the "scroll down" indicator instead of a generic chevron.
- **Paddy fields (সবুজ, shonali sabuj — "golden green")** — instanced grass/rice-stalk geometry with wind-sway vertex animation on the About section's riverbank; color grades from green to gold as the "camera time of day" advances, echoing years-of-experience/growth.
- **Nakshi kantha stitching** — the running-stitch pattern from this embroidery tradition becomes the **scroll-progress track**: a thread that visibly stitches itself along the riverbank as the user scrolls, current position marked by a needle. Doubles as a wayfinding UI element.
- **Sundarbans silhouette** — a distant mangrove treeline with a single Royal Bengal tiger silhouette that only becomes visible (parallax, deep background) during the Skills section — a quiet "hidden strength" moment, not a jump-scare.
- **Terracotta temple/mosque relief patterns** (e.g. Kantajew Temple, Sixty Dome Mosque brickwork) — used as the bump/normal-map texture on architectural blocks that assemble themselves in the Projects section, one block per project, echoing terracotta plaques that each depict a scene.
- **Rickshaw-art color and linework** — the hyper-saturated floral/geometric painting style used for particle trail colors (cursor trail, button hover bursts) instead of generic neon.
- **Alpana (rice-paste floor art) / Pohela Boishakh motifs** — a radial pattern that draws itself (SVG-morph or shader) as the loading-screen animation, replacing a generic spinner.
- **Fireflies + monsoon rain** — GPU-instanced particles: rain during a brief transitional "monsoon" section (Experience — depicting challenges weathered), fireflies over water at night in the Contact section, doubling as literal points of light the cursor can attract (delight, not gimmick).
- **The flag's red disc** — reused consistently as sun (Hero, dawn) → setting sun (Projects, dusk) → moon (Contact, night) — one recurring circular motif tying the whole day-cycle together, rather than three unrelated assets.
- **Repeating place-name/coordinate motif** (borrowed structurally from tbwahakuhodo.co.jp's "35.6430°N, 139.7470°W") — section transitions briefly show real coordinates and names, e.g. `23.8103°N 90.4125°E — DHAKA`, `22.4707°N 89.1897°E — SUNDARBANS`, grounding the fictional camera journey in real places.

---

## 4. Section-by-section camera & scene mapping

| Section | Time of day / place | Camera behavior | Foreground content |
|---|---|---|---|
| **Loader** | Pre-dawn, black | Static, alpana pattern draws itself | Progress = pattern completion % |
| **Hero** | Sunrise, rural riverbank | Camera floats just above water, slow forward drift | Name/title typography over water reflection; nouka boat carries scroll cue |
| **About** | Morning, paddy fields | Camera rises, pans across fields | Bio text pinned while stalks sway; growth-coded color (green→gold) |
| **Skills** | Midday, riverbank near Sundarbans edge | Camera slows near treeline | Skill icons as fireflies/lanterns that ignite on scroll; tiger silhouette in deep background |
| **Projects** | Dusk, approaching Dhaka | Camera moves into denser geometry, buildings assemble from terracotta-textured blocks | One block/building per project; click = camera dollies in to that project's "window" (case-study modal) |
| **Experience** | Brief monsoon, river narrows | Rain particles, camera briefly slows/shakes subtly | Timeline stitched via the nakshi-kantha thread motif |
| **Contact** | Night, open char (river island), stars + fireflies | Camera settles, comes to rest | Form appears as a lantern glow; moon = the flag's red disc, now silver/pale |

Scroll = distance along a Catmull-Rom spline through these stations; GSAP ScrollTrigger (or Framer Motion's `useScroll` + a manual camera-position tween) maps scroll progress `0–1` to spline `t`, with each section pinning briefly (like GSAP's own site) so content is readable before the camera continues.

---

## 5. Technical architecture

Given the current stack (Next.js App Router, TypeScript, Tailwind, **Framer Motion**, Firestore — see [PLAN.md](PLAN.md)), this is an additive layer, not a rewrite:

- **Renderer**: `@react-three/fiber` + `@react-three/drei` (React-idiomatic, plays well with RSC boundaries — the 3D scene is one `"use client"` island, not the whole app).
- **Scroll → camera**: keep **Framer Motion** (`useScroll`, `useTransform`) already in the stack to drive camera `t` along the spline — no need to introduce GSAP/ScrollTrigger as a second animation runtime unless timeline complexity demands it later.
- **Assets**: low-poly, hand-modeled or Blender-exported glTF, Draco-compressed, texture atlases kept small (<2K) — the low-poly aesthetic is a *style choice* here (fits the folk-art motifs) as well as a perf necessity.
- **Particles**: `InstancedMesh` for rice stalks, fireflies, rain — never one draw call per particle.
- **Quality presets** (directly inspired by khaledoghli.com): `low / normal / high` toggle in a settings affordance — `low` disables particles/post-processing and drops to a single static parallax image per section (also the automatic path for `prefers-reduced-motion` and for any device that fails a WebGL capability check).
- **Post-processing**: minimal — soft bloom for golden-hour/firefly glow only; avoid heavy effects that hurt battery/mobile GPUs.
- **Sound**: optional, off by default, explicit toggle (river/monsoon/night ambience per section) — same affordance pattern as khaledoghli.com, never autoplaying with sound.
- **SEO/content**: all real text (name, bio, project descriptions) stays normal DOM content layered over the canvas (`position: fixed` canvas behind `position: relative` HTML), so nothing in [PLAN.md](PLAN.md)'s SEO/accessibility requirements regresses — the 3D scene is a backdrop, never a replacement for real markup.

---

## 6. Color palette (from the flag and land, not a generic gradient)

| Token | Hex | Use |
|---|---|---|
| `--bd-green-deep` | `#006A4E` | Flag green — paddy shade, night sky base |
| `--bd-red` | `#F42A41` | Flag red disc — sun/moon motif, primary accent |
| `--bd-gold` | `#D4A017` | Ripe paddy, dusk light, terracotta highlights |
| `--bd-terracotta` | `#B25730` | Temple brick relief, Projects section blocks |
| `--bd-indigo-night` | `#0B1E3B` | Contact section sky, star backdrop |
| `--bd-cream` | `#F4ECD8` | Nakshi kantha thread, UI text on dark scenes |

---

## 7. Guardrails (non-negotiable)

- **Reduced motion**: `prefers-reduced-motion` (already a stated requirement in [PLAN.md](PLAN.md) for the Framer Motion layer) disables the WebGL scene entirely and swaps in static, art-directed stills per section — same visual world, no motion.
- **Mobile/low-end fallback**: WebGL capability + a rough perf probe on mount decide the quality preset automatically; never force a phone into the `ultimate` scene.
- **Content-first**: every section must be fully readable and navigable with the canvas removed (progressive enhancement, not a dependency).
- **No dark patterns from the reference sites**: no forced sound-on, no gating content behind a "click to enter" 3D loader beyond the existing loading screen.

---

## 8. Open questions for the user before building — resolved

1. ~~Full WebGL or lighter 2.5D?~~ → **2.5D**: layered CSS/DOM, no Three.js, no new dependencies.
2. ~~Replace or coexist?~~ → **Coexist**: ships as one new opt-in entry in the existing admin animation catalog, alongside the current ball/circuit/road effects. Nothing existing changes.
3. Asset budget → moot under 2.5D: no glTF/Blender pipeline, everything is CSS shapes/gradients.

---

## 9. Build prompt

The concrete prompt this section was generated from, kept here so the "why" of the implementation traces back to a single source instead of living only in commit messages:

> Build "River Path" as a new effect inside the existing `src/components/surprise/` kit (see `effect.ts`, `catalog.ts`, `effects/index.ts`) — the same plugin system that already powers the admin's animation toggles and the surprise button. It must satisfy that kit's existing contract (`SurpriseEffect`: `id`, `label`, `channel`, `animated`, `start()` returning its own teardown) so it plugs into the admin dashboard and the surprise button for free, with zero changes to Firestore, server actions, or any repository — those already work generically over the registry.
>
> Render it as a single full-page backdrop layer (`channel: "backdrop"`, matching `scenery`/`starfield`/`grid-warp`) depicting a Bangladeshi river journey — dawn riverbank → paddy fields → a Dhaka-esque skyline → a starlit night — using only CSS gradients/shapes/keyframes plus one scroll listener, no canvas, no WebGL, no new npm dependencies. Tie the day-cycle progression to how far down the page the reader has scrolled, so scrolling the site reads as traveling the river, per the "whole page is one scene" idea in §2 of this document.
>
> Engineering constraints: decompose by responsibility into separate files (one per visual layer: sky/water, skyline, paddy field, boats, night accents, plus the shared scroll-progress and palette utilities), each independent and unit-simple, then compose them in one final file that performs the actual wiring into the `SurpriseEffect` contract. Apply SOLID/DRY/KISS — no layer knows about any other layer; adding or removing one is a one-line change in the final wiring file and the registry barrel. Reuse the kit's existing DOM/CSS helpers (`injectStyle`, `mountLayer`, `fadeIn`, `LAYER`, `between`, `randomOf`) rather than re-implementing them. Keep comments short and to the point. Do not touch any backend/Firestore/server-action code, do not delete any existing file. Mark each part of this checklist done as it's finished. Do only the verification this repo already runs (`lint`, `typecheck`) — no new test framework.

### Progress

- [x] `effects/river-path/layer.ts` — shared `RiverLayer` interface every visual layer implements
- [x] `effects/river-path/palette.ts` — Bangladesh day-cycle colour tokens (dawn/day/dusk/night)
- [x] `effects/river-path/scroll-progress.ts` — scroll-fraction observer (`0` top → `1` bottom)
- [x] `effects/river-path/sky-water.ts` — sky + water gradient band that pans through the day cycle on scroll, plus a river shimmer
- [x] `effects/river-path/skyline.ts` — Sundarbans treeline + Dhaka/mosque-dome skyline silhouette, dawn/night glow crossfade
- [x] `effects/river-path/paddy-field.ts` — swaying paddy-stalk foreground, fades toward night
- [x] `effects/river-path/boats.ts` — drifting nouka boat silhouettes on the water band
- [x] `effects/river-path/night-accents.ts` — fireflies + stars, fade in as the scroll reaches "night"
- [x] `effects/river-path/index.ts` — final wiring file: composes all layers into one `SurpriseEffect`
- [x] Registered in `effects/index.ts` (the site's effect registry) — one import, one array entry, one re-export
- [x] `npm run lint` and `npm run typecheck` pass (river-path introduces zero new lint/type errors; `typecheck` is fully clean, and lint's 4 pre-existing findings are all in unrelated files)
