# Immersive 3D World — Act II direction & build plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

Working file for the second act of the 3D work: turning a well-built
scroll-driven scene into a **world the visitor travels through**. Read this
before writing code, resume at the first unchecked box, flip the box in the
same session that does the work.

**Sibling trackers — do not duplicate their scope here:**

| File | Owns | Relationship |
|---|---|---|
| [THREE_D_EXPERIENCE_PLAN.md](THREE_D_EXPERIENCE_PLAN.md) | Act I, phases 0–12, **all complete** | The foundation this file builds on. Its §0 audit and §27 layout still bind. |
| [GAME_LAYER_PLAN.md](GAME_LAYER_PLAN.md) | Opt-in "Game Mode" (`src/game`, `WorldLayer`, `GameHUD`) | A *different* layer the visitor opts into. Untouched except for the canvas arbitration in D2. |
| [GAMIFICATION_PLAN.md](GAMIFICATION_PLAN.md) | Scoring/collectibles on Game Mode | Unrelated. |

---

## 0. What Act I shipped, and what is still true

Verified against the tree on 2026-09-12 (branch `3d.1`). ~2,375 lines across
`src/three` plus 13 modules in `src/lib/experience`. Everything below is a
**load-bearing invariant** — Act II extends it, never re-implements it.

| Invariant | Where | Consequence for Act II |
|---|---|---|
| One persistent `<Canvas>`, mounted once in the public shell | [scene-root.tsx](src/three/scene/scene-root.tsx) → [(site)/layout.tsx](<src/app/(site)/layout.tsx>) | Never add a second canvas. New sections mount as groups inside `SceneCanvas`. |
| `three` is code-split behind `next/dynamic` + `ssr: false` | [scene-root.tsx](src/three/scene/scene-root.tsx) | Anything importing `three` stays on the split side. `scene-root.tsx` itself must not import it. |
| Scroll is the only story parameter | [use-scene-progress.ts](src/lib/experience/use-scene-progress.ts) | One store, one observer, one scroll listener. Progress is in **section space** (midpoint-interpolated), not document pixels. Do not add a second scroll source. |
| Camera path = one waypoint per section, in **real DOM order** | [camera-rig.tsx](src/three/scene/camera-rig.tsx) | Order is `hero → about → skills → projects → experience → contact`. Projects precedes Experience; `SECTION_TONES` order is *not* page order. |
| Palette derives from the page's own tokens | [scene-palette.ts](src/lib/experience/scene-palette.ts) | `buildScenePalette(tone, background)` → `accent · wash · atmosphere · key · fill · surface · deep · dark`. No new palette, ever. |
| Frame-loop motion has a named vocabulary | [scene-motion.ts](src/lib/experience/scene-motion.ts) | `SCENE_SMOOTHING.{snap,tight,glide,drift,cinematic}`, `damp`, `springStep`, `stagger`, `easeOut*`. Add to it; never inline a new magic constant. |
| Quality is a budget, not a switch | [device-tier.ts](src/lib/experience/device-tier.ts) + [fps-monitor.tsx](src/three/scene/fps-monitor.tsx) | Tier steps *down* at runtime on sustained FPS drop and stays down for the session. New features take a budget number, not a boolean. |
| Frameloop is gated three ways | [scene-canvas.tsx](src/three/scene/scene-canvas.tsx) | `never` off-screen/hidden · `demand` under reduced motion · `always` otherwise. New raf work obeys the same gate. |
| Canvas is `pointer-events-none`, `aria-hidden`, `z-index: -8` | [scene-root.tsx](src/three/scene/scene-root.tsx) | **The scene can never raycast.** All 3D interaction is DOM-driven — see D1. |
| Content reaches 3D by a zero-render bridge | [scene-data-bridge.tsx](src/three/bridge/scene-data-bridge.tsx) → [scene-content-store.ts](src/lib/store/scene-content-store.ts) | Sections push already-fetched props into a store. 3D never fetches. |
| Admin owns the master switch | `ANIMATION_IDS` in [content.ts](src/lib/types/content.ts): `three-scene`, `three-particles`, `three-camera-scroll` | Extend this list if a new subsystem needs a switch. No parallel animation state. |
| Composition is measured, not guessed | Act I, Phase 12 | Objects are placed in **screen fractions** derived from the real layout constants (`CONTENT_MAX_PX = 1216`, `CONTENT_PAD_PX = 40`), so 3D can never overlap the text column. Keep this method for every new object. |

### Verified absences — opportunities, not oversights

- **~~No custom shader anywhere.~~** Spent by Phase 19: [atmosphere.tsx](src/three/scene/atmosphere.tsx) is Act II's one custom material (D6). The budget is now closed — a second one needs a new decision, not a new file.
- **~~No post-processing.~~** Still none, and now honestly so: Phase 19 deleted `budget.postProcessing` from `SceneBudget` rather than inventing a consumer (D5).
- **~~Lenis is installed and imported nowhere.~~** Gone. `grep -n lenis package.json` and `ls node_modules/lenis` both come back empty as of Phase 19.
- **GSAP is installed but used only by Game Mode's camera system.** Nothing in `src/three` imports it.
- **No Services/Capabilities section exists.** See D8 — a content question, not a 3D one.
- **No custom cursor, no DOM card tilt.** [project-card.tsx](src/components/projects/project-card.tsx) is a flat `transition-[border-color,box-shadow,transform]` card.

---

## 1. Gap ledger — the brief against the repo

Ordered by how much each changes the *felt* experience, not by brief order.

| Brief | Asks for | Today | Verdict |
|---|---|---|---|
| §10, §37-P2 | Objects **transform** into each other; never fade-out/fade-in | Each section-scene fades on its own entry/exit span | **The biggest gap.** Phase 14. |
| §16 | One signature "wow" moment | The Projects → Experience set piece, scroll-scrubbed, three variants | **Closed** — Phase 18. |
| §7, §8 | Hovering a skill makes the system react | DOM pill publishes to `scene-interaction-store`; the galaxy reads it per frame | **Closed** — Phase 16. |
| §12, §14 | Project cards are physical, layered, tilting objects | Flat DOM cards; the WebGL corridor behind them is unrelated to them | Phase 13. |
| §4 | Hero **disassembles** into About's fragments | Hero fades out; fragments fade in from an independent seeded scatter — visually adjacent, not causally linked | Phase 14. |
| §24, §25 | Scroll feels physical | One spring at the source (`<ScrollPhysics>`), read per frame by every object | **Closed** — Phase 15. |
| §34 | Optional desktop cursor | None | Phase 13, low risk. |
| §20 | Shaders where they earn it | One: the graded atmosphere shell | **Closed** — Phase 19. Budget spent; see D6. |
| §22 | Particles read as *dust in a room*, not stars | 80 / 200 / 500 by tier, across three depth bands | **Closed** — Phase 19. |
| §23 | Sparing post-processing | None, and no flag pretending otherwise | **Closed** — Phase 19 deleted the dead flag; D5 stands. |
| §9 | Experience reads as architecture the camera moves through | Stations on both gutters, ribs, a depth-raked type column, parallaxed floor/ceiling | **Closed** — Phase 17. |
| §15 | Services as abstract objects | No such section | **Still gated** on real content — D8. Phase 20 went to the drifters; this one waits for a phase of its own. |
| §33 | Navigation behaves spatially | `scroll-progress-line.tsx` exists and is good | Small polish in Phase 13. |
| §35 | Sound | None | **Non-goal.** Stays none. |

---

## 2. Direction (binding — re-read before every phase)

**Thesis.** A developer's working mind rendered as an architectural space. The
visitor descends through it. The space is the site; the portfolio content is
what the space was built to hold.

| Section | Spatial idea | Intensity | The visitor should feel |
|---|---|---|---|
| Hero | THE ORIGIN — one designed object held in air | ●●●●○ | "Something is here." |
| About | THE FRAGMENTATION — that object, broken, reorganizing | ●●○○○ | "It came apart, and it's finding an order." |
| Skills | THE SYSTEM — fragments become a live network | ●●●○○ | "I can touch this." |
| Projects | THE ARCHIVE — a gallery corridor, then the signature moment | ●●●●● | "How did that just happen?" |
| Experience | THE ARCHITECTURE — a structure the camera travels through | ●●●○○ | "I'm moving through time." |
| Contact | THE RELEASE — the space opens and quiets | ●○○○○ | "The journey ended somewhere." |

Rhythm: **calm → impact → calm → discovery → build → WOW → release → calm.**
The calm sections make the loud one land. Resist decorating them.

**Forbidden — the "authored, not generated" test.** Purple neon; glowing orbs;
floating cubes; cycling hues; infinite starfields; everything rotating at once;
one animation copy-pasted across cards; glassmorphism on every surface;
gradient text; bloom substituting for composition; 3D that exists because the
library is installed.

**Negative space is a spec, not a taste.** At any scroll position the frame
reads as one focal mass + 2–5 secondary elements + near-empty depth. If a
1440×900 screenshot has no large quiet region, the composition is wrong.

**Typography stays king.** Nothing readable lives in WebGL. The scene frames
the text column; Phase 12's screen-fraction placement is how that is enforced.

---

## 3. Architecture decisions

Binding until superseded here.

**D1 — 3D interaction is DOM-driven; the canvas never raycasts.**
The canvas is `pointer-events-none` at `z-index: -8` and stays that way — it
sits *behind* content, so making it interactive would either steal clicks or
force a restack of the whole page. Instead a DOM element owns the hover and
publishes intent to a store the scene reads.
→ New `src/lib/store/scene-interaction-store.ts`: `{ hoveredSkillId,
hoveredProjectId }`, written by DOM handlers, read inside `useFrame` via
`store.getState()` — **not** a React subscription (§8). Same hand-off shape
`scene-data-bridge.tsx` already uses for data.

**Amended in Phase 20.** The store shipped with a third field, `pointerTarget`,
that nothing ever read — pointer position had already gone to a module-scope
singleton instead. Phase 20 deleted it and drew the line the store was missing:
**id-shaped intent lives in the store; continuous per-frame values do not** —
those go to a plain module singleton (`scene-scroll.ts`, `scene-signature.ts`,
and now [scene-pointer.ts](src/lib/experience/scene-pointer.ts)), because a
store write per frame is a store write too many.

D1 itself is unchanged by Phase 20's drag: the canvas is still
`pointer-events-none` at `z-index: -8` and still owns no raycaster. The press
is a DOM `window` listener, the hit test is a screen-space distance in NDC, and
a press that lands on a link or a button is disowned before the scene sees it.

**D2 — One cinematic canvas; Game Mode arbitrates.**
Game Mode mounts its own canvas; two live WebGL contexts is the one place the
"one canvas" rule meets reality. While Game Mode is active the cinematic scene
drops to `frameloop="never"` — not unmount, since a page-level canvas is
expensive to rebuild. Wire it through the existing game store, not a new flag.

**D3 — Lenis: adopt it, or delete the dependency.**
Do not leave it installed and unused. Adopt only if Phase 15 confirms all
three: (a) it runs one raf shared with R3F rather than a competing loop,
(b) `use-scene-progress` reads Lenis's value instead of adding a second
source, (c) it is off under reduced motion and on touch. If any fails,
`npm rm lenis` and keep native scroll with the existing damping.

**Resolved — Phase 15: delete.** (b) and (c) are satisfiable; (a) is not, and
one failure is enough. Lenis `preventDefault`s wheel events and advances scroll
from its own raf (`node_modules/lenis/dist/lenis.mjs:627`), so sharing R3F's
loop makes the page scrollable only while the canvas is ticking — and the
canvas is optional by design: `three-scene` off returns `null`, a WebGL failure
returns `null` through `SceneErrorBoundary`, an off-screen tab sets
`frameloop="never"`, and the dynamic import has not resolved at all on first
paint. Any of those would freeze the page outright, inverting §9's "nothing
meaningful exists only in WebGL". `autoRaf: true` is precisely the competing
loop (a) forbids; inverting the dependency (Lenis driving R3F via `advance()`)
would require permanent `frameloop="never"`, which destroys the three-way
frameloop gate, breaks `FpsMonitor`'s delta sampling and forfeits §8's
off-screen savings. Physicality comes from a spring at the source instead —
see Phase 15.

**D4 — GSAP/ScrollTrigger: resolved, not needed. GSAP stays out.**
The scrubbed-progress model already covers ordinary choreography with one
listener. ScrollTrigger earned its place only where **pinning** was required —
Phase 18. *Phase 18 landed without pinning:* §5's hold beat is a plateau in a
keyframe table (`scene-signature.ts`) rather than a locked scroll position, so
the moment is scrubbed like everything else and "never traps the scroll" is
structural rather than defended. **Verdict: do not add GSAP/ScrollTrigger.**
Nothing left in Act II asks for pinning; reopen this only if something does.

**D5 — Post-processing: default is none.**
The scene must be beautiful without it (§23), and it is. A bloom or DoF pass
costs a full-screen render per frame and would be the first thing the FPS
monitor steps down. Verdict: **do not add `@react-three/postprocessing`.** If
Phase 18 proves the signature moment needs a transition distortion, that is
one custom pass inside the D6 budget, not an effect stack. Either way Phase 19
must reconcile the dead `budget.postProcessing` flag: give it a consumer or
remove it from `SceneBudget`.

**Phase 19 verdict: deletion.** Its one reader was `hero-core-scene.tsx`, and
that file's own comment admitted the flag was standing in for "is this the top
tier" — so it was a `tier === "high"` test wearing a misleading name, and a
future reader would reasonably have assumed an `EffectComposer` existed
somewhere. The halo shell now gates on the tier directly. `postProcessing` is
out of `SceneBudget`, out of all three budgets, and out of `stillBudget`.

**D6 — Shader budget: exactly one custom material for Act II.**
Spend it on the atmosphere (a depth-graded background that replaces
fog-plus-plane guesswork) *or* on the signature transition. Not both. Every
shader needs a `budget`-aware fallback to a standard material.

**Phase 19 spend: the atmosphere.** Phase 18 shipped the signature moment on
standard materials and does not want a distortion pass, so the budget went to
the background, where it is on screen for the whole scroll rather than for one
beat. Fallback: `budget.tier === "low"` renders nothing and keeps the fog-only
background it already had — a full-viewport fill is pure fill rate, the one
thing a phone has least of. **The budget is now closed.**

**D7 — `useSceneProgress` stays the only story parameter.**
Section-local progress comes from `sceneSectionProgress(progress, index)`. A
new section gets a waypoint in `PATH` and an index — nothing else.

**D8 — Services/Capabilities is deferred, deliberately.**
Brief §15 assumes a section that does not exist. Inventing marketing copy to
justify five abstract objects is exactly the "3D for its own sake" the same
brief forbids. It unblocks **only** when real services content exists in
Firestore with an admin editor, like every other section. Until then it is not
a gap.

**Still gated after Phase 20.** Phase 20's slot was spent on the drifting
objects instead (§11) — a 3D feature that needs no copy. The Services section
has not been started, unblocked, or quietly satisfied; D8 stands exactly as
written, and whichever phase takes it up owns the content question first.

---

## 4. The continuous world — spatial script

The page is one timeline. Every boundary below is a **transformation**, never a
cut. This table is the contract Phase 14 implements.

| Boundary | Mechanism — how A *becomes* B | Duration | Camera |
|---|---|---|---|
| Hero → About | The sculpture's shell **splits along its own seams**. Fragment count, start position and start rotation are read from the sculpture's final frame, not seeded independently. Two fragments pass in front of the heading, the rest behind. | 1.2–2.5s | Dolly forward through the breaking shell; FOV holds. |
| About → Skills | Fragments stop drifting and **snap to lattice positions**; edges draw *between fragments that already exist*. Nothing new spawns. | 0.8–1.8s | Lift and orbit ~8°, revealing the lattice has depth. |
| Skills → Projects | Network edges **stretch and straighten** into the corridor rails; nodes flatten into the first panels. | 1.2–2.0s | Lens tightens 48° → 43° (already in `PATH`); dolly runs down the corridor axis. |
| Projects → Experience | The archive **collapses into one panel**, then that panel's interior becomes the next space. *(The signature moment — §5.)* | 2–4s | Push in, hold, release backward into the new volume. |
| Experience → Contact | Corridor structures **recede and thin**; the last flattens to a horizon line. | 1.2–2.2s | Pull back, FOV opens to 51°, everything gets further away. |
| Contact → end | Horizon line dims toward `palette.deep`. Nothing new appears. | — | Rest. |

**How to build a handoff without spaghetti.** Each boundary owns one `handoff`
value derived from `sceneSectionProgress`, read by *both* neighbours — the
outgoing object as "how disassembled am I", the incoming as "how assembled am
I". Geometry that must literally be shared (Hero's shell → About's fragments)
is built once in [geometry.ts](src/three/scene/geometry.ts) and referenced by
both, so "the same object" is true in the buffer, not only in the art
direction.

**The dwell rule.** A section's animation finishes inside ~72% of its span
(`ENTRY_SETTLE`, already in `camera-rig.tsx`) and then *holds still*. A scene
that animates continuously through a whole section never arrives anywhere.

---

## 5. The signature moment (§16)

One per site. Fires once per session, at the Projects → Experience boundary, on
the lead project only.

| Beat | ms | What happens |
|---|---|---|
| 1. Approach | 0–600 | Camera dollies toward the lead panel. Other panels dim toward `palette.deep`. DOM cards fade to ~0.15. |
| 2. Commit | 600–1100 | The panel scales to fill the frame. Corridor rails converge toward its edges — the room collapses *into* the panel, it does not fade. |
| 3. Hold | 1100–1500 | Near-total stillness. One beat of quiet. This is what makes it read as authored; do not shorten it. |
| 4. Release | 1500–2600 | The panel surface breaks outward past the camera. Behind it: the Experience volume, already lit and waiting. |
| 5. Settle | 2600–3200 | Camera eases to the Experience waypoint. Normal choreography resumes. |

**Constraints.**
- Scroll-scrubbed, not autoplayed — the visitor stays in control and can reverse it.
- ~~If pinning is required, that is the single place GSAP/ScrollTrigger enters (D4).~~ **Phase 18 shipped without pinning; the hold beat is a plateau in the beat table, and GSAP stays out (D4).**
- **Never traps.** Reverse scroll reverses the sequence; a fast flick lands on the end state rather than queueing.
- Reduced motion: cross-dissolve to the Experience framing over 400ms. No collapse, no camera travel.
- `low` tier / mobile: beats 2–4 compress into one 900ms scale-and-dissolve. The idea survives; the render cost does not.
- Once per session (`sessionStorage`); afterwards it plays as a plain quick transition. Spectacle that repeats becomes friction.

---

## 6. Interaction specs

**Project cards — DOM, §12/§14.** Damped, using `SPRING.*` from
[springs.ts](src/lib/experience/springs.ts):
- `rotateX` ≤ ±4°, `rotateY` ≤ ±6°, `translateZ` 8–30px.
- Layered via `transform-style: preserve-3d` — image `−1`, surface `0`, metadata `+0.1`, title `+0.2`, CTA `+0.3`; roughly 4–10px of real parallax on the foreground, less on the image.
- One damped light sweep tied to the same pointer value — not a second animation.
- Enter 150–350ms · return 300–600ms · never snap.
- `@media (hover: hover) and (pointer: fine)` only; off under reduced motion.
- **Cheapest technology that works (§14):** this is CSS perspective, not WebGL. Do not build meshes for it.

**Skill nodes — §7/§8.** DOM chip hover → `scene-interaction-store` → the
galaxy responds: hovered node eases ~15% toward camera, its edges brighten, its
two nearest neighbours drift toward it, everything else slows ~20%. Fake the
physics by interpolation (`springStep`, `SPRING.gentle`) — no rapier, no
solver. Release returns over ~600ms.

**Cursor — §34.** Desktop only; off on touch, under reduced motion, and when
`three-scene` is off. Three states maximum: point · ring (interactive) · label
("VIEW" on projects). One fixed element with transform interpolation. If it
ever visibly lags the real cursor, delete it.

**Drifting objects — Phase 20.** Desktop grab only, and the only interaction in
this plan that touches an object directly rather than through a DOM proxy —
which it earns by owning no raycaster and stealing no clicks (D1). Press near
one and it comes to hand on `SPRING.snappy`; release and it returns to its lane
on `SPRING.settle`, keeping the throw's momentum on the way. Held, it brightens
and spins up; that is the whole feedback vocabulary. Off under reduced motion
(the lanes keep travelling, the grab does not exist) and off on touch.

**Micro-interactions — §17.** Buttons 2–4px lift + small active compression;
links with a travelling underline; icons ≤6° rotation or 2px translate; all
120–250ms. These stay in Motion/CSS where they already live — the 3D layer does
not reach into them.

**Navigation — §33.** Keep
[scroll-progress-line.tsx](src/components/motion/scroll-progress-line.tsx). Add
only this: the active-section marker eases with `SPRING.gentle` instead of
snapping. No animated navbar.

---

## 7. Motion, light, and material ledgers

**Timing** — extends, does not replace, `DURATION` in `variants.ts`:

| Class | Band |
|---|---|
| Micro feedback | 120–250ms |
| Hover / state change | 250–450ms |
| Card entrance | 500–900ms |
| 3D object transition | 800–1800ms |
| Section transformation | 1200–2400ms |
| Camera move | 1000–2200ms |
| Signature moment | 2000–3200ms |
| Ambient loops | 8–30s |

**Curves.** No linear motion outside constant ambient rotation. Arrivals
decelerate (`easeOutCubic`; `cubic-bezier(0.16, 1, 0.3, 1)` in CSS). Camera
spans ease both ends (`easeInOutSine`). Exits are faster than entrances.
Response scales with perceived mass: camera slowest → sculpture → fragments →
UI fastest.

**Choreography, not synchrony — §24.** Stagger the chain: camera leads →
primary object reacts ~120ms later → secondary elements ~240ms → DOM text last.
`stagger()` in `scene-motion.ts` does this; use it instead of driving
everything off the same raw ramp.

**Lighting.** One rig, four lights maximum: soft key, weak fill, rim for
silhouette separation, one optional section accent. Per section the *mood*
shifts, never the hue set — Hero dramatic key + restrained rim · About diffuse ·
Skills sharper speculars · Projects gallery spot · Experience directional and
architectural · Contact soft and low. **No light flashes during a transition:**
interpolate intensity with `SCENE_SMOOTHING.cinematic`.

**Materials.** 60–70% matte/satin · 20–30% metal · 5–10% glass or emissive
accent. `meshStandardMaterial` by default. Act I removed `transmission` because
there was no environment map to refract — **do not reintroduce it** without
also mounting an env map and measuring the cost.

**Colour.** `buildScenePalette()` output only. One accent, at most one
secondary. Across a depth rake move lightness and chroma, never hue.

---

## 8. Performance contract

Target 60fps on desktop; no frame over 16ms during scroll on `mid`.

**Revised particle budget.** Brief §22 (100–400 desktop) and the old
`600 / 2200 / 5000` describe different things — the field is one instanced
`Points` buffer, which is cheap, but 5000 points reads as *stars in space*,
which the brief rejects. Fix the look first: dust should be sparse, large,
slow, and depth-graded across three bands with the near band barely moving.
Land near 300–600 `high`, 200 `mid`, 80 `low`, and judge from a screenshot,
not a counter.

**Landed (Phase 19): `500 / 200 / 80`,** split 22/34/44 across the three bands
in [environment.tsx](src/three/scene/environment.tsx). `budget.particles` is
now the dust count itself, not a number some caller scales by 0.4. The two
close-up shells that share the field's budget — Game Mode's core and the
standalone skill galaxy — want the opposite grain, so each multiplies by its
own named `SHELL_DENSITY` and lands within ~15% of its pre-Phase-19 count. One
budget number, two documented local factors; **do not add a second field to
`SceneBudget`** for this.

**Frame-loop discipline** — the rules already in force; keep them:
- No React state updates inside `useFrame`. Read stores with `getState()`.
- No allocation inside `useFrame`. Module-scope scratch vectors (`scratchPosition`, `scratchLookAt`) are the established pattern.
- Geometry and materials created once, memoised on budget, reused across instances.
- `InstancedMesh` for anything repeated more than ~8 times.
- Draw-call ceiling **≤60** at any scroll position on `mid`. Measure before and after each phase.
  Phase 20's drifters are the largest single add against it: **+8 / +5 / +3**
  (`high` / `mid` / `low`), one non-instanced draw each. Not instanced on
  purpose — five different geometries, per-object opacity, and eight at most;
  the §8 rule says instance past ~8 repeats *of the same thing*, and this is
  neither repeated nor the same.
- Never animate one property from two systems at once.

**Off-screen work** already stops via `useSceneActive` + `frameloop`. Anything
new — cursor loop, interaction store — is gated the same way or it defeats the
existing saving. `<ScrollPhysics>` is inside the canvas, so `frameloop` gates it
for free.

---

## 9. Control matrix

Every new feature fills a row before it counts as done.

| Feature | `three-scene` off | Reduced motion | `low` tier | No WebGL |
|---|---|---|---|---|
| Persistent canvas | not mounted | mounted, `demand` | mounted | boundary → null |
| Camera travel | — | frozen at Hero waypoint | reduced amplitude | — |
| Dust field | — | static | 80 particles | — |
| Atmosphere shell | — | mounted; colour lands without interpolating | not drawn — fog only | — |
| Section transformations | — | cross-fade only | simplified | — |
| Signature moment | — | 400ms dissolve, no collapse or camera travel | beats 2–4 → one 900ms scale-and-dissolve, no shatter | — |
| Card tilt (DOM) | **still works** — CSS, not 3D | off | on | on |
| Custom cursor | off | off | on | on |
| Drifting objects | not mounted | mounted; lanes still, no grab | 3 objects | boundary → null |
| Skill hover reaction | DOM chip still highlights | DOM only | on | DOM only |

Two rules behind the table: **nothing meaningful exists only in WebGL**, and
`three-scene` off must actually *stop the work*, not hide it.

New subsystems needing their own switch get an entry in `ANIMATION_IDS` and a
row in `/admin/settings`, subordinate to `three-scene`. Act II's two are both
shipped: `three-cursor` (Phase 16), `three-signature` (Phase 18) and
`three-drifters` (Phase 20). Do not add `qualityLevel` /
`particleIntensity` — Act I's Phase 9 found no demand, and `device-tier`
already covers it.

---

## 10. Mobile is its own composition

Not a scaled-down desktop scene (§28). What survives, per section:

- **Hero:** the sculpture, larger in frame, no secondary ring. No parallax — there is no pointer.
- **About:** 5 fragments, not 9–12.
- **Skills:** the lattice with fewer nodes (`budget.galaxyNodes` handles this), no hover state — tap is not hover; do not fake it.
- **Projects:** the corridor reads as two panels and the end wall. Cards are flat and fast.
- **Experience:** one structure, receding. No travel.
- **Contact:** the horizon line only.

Touch never emulates mouse parallax. DPR capped at 1.5. No shadows.

Phase 20's drifters keep travelling on touch — they are ambient motion, not a
pointer reaction — but they cannot be grabbed. The listener never binds without
`(pointer: fine)`, and it drops `pointerType === "touch"` besides, so a scroll
that starts on a drifter is a scroll.

---

## 11. Phases

Each phase: ship it, verify it against its acceptance line, flip the box.
Phases are ordered so the cheap wins land first and the risky one lands on a
foundation that is already proven.

- [x] **Phase 13 — The interaction spine.**
      `scene-interaction-store.ts` (D1); DOM project-card tilt with real
      layered depth (§6); the optional desktop cursor; the nav marker easing.
      All DOM/CSS — no new WebGL. Lands the most perceived physicality per
      line of code.
      *Accept:* a card responds to the pointer like a physical object at
      1440 and does nothing at all on touch or under reduced motion.

      **Verified:** `scene-interaction-store.ts` added (unread until Phase
      16 wires a consumer). `project-card.tsx` rewritten as a client
      component: `rotateX`/`rotateY` track the pointer (`SPRING.snappy`), a
      shared `tiltZ` (`SPRING.panel`) drives per-layer `translateZ` by depth
      weight (image −24px, metadata +2.4px, title +4.8px, cta +7.2px), and a
      lagging light sweep (`SPRING.trail`) follows the pointer under the
      text. Gated on `useFinePointer() && !useMotionPreference()`, evaluated
      unconditionally (both hooks run every render — an earlier `&&`
      short-circuit tripped `react-hooks/rules-of-hooks` in lint and was
      fixed). Touch/coarse pointer and reduced motion fall back to the
      original static `-translate-y-1` hover, confirmed via SSR output
      (`matchMedia` is unavailable server-side, so the fallback class is
      what actually ships in the initial HTML — verified by curling
      `/projects` and finding no `preserve-3d`/`perspective` inline styles
      on the card and the static hover class present instead).
      `custom-cursor.tsx` added and mounted in `(site)/layout.tsx` next to
      `SceneRoot`: dot on `SPRING.cursor`, ring lagging on `SPRING.trail`,
      grows over `data-cursor-label`/interactive elements, requires fine
      pointer + motion allowed + the new `three-cursor` admin toggle (added
      to `ANIMATION_IDS` and the admin settings page) — confirmed absent
      from SSR output for the same reason. `.custom-cursor-active` lives
      unlayered in `globals.css` so it beats Tailwind's layered `cursor-*`
      utilities; a stray extra `}` this introduced (breaking every route
      with a PostCSS syntax error) was caught by loading the dev server and
      fixed. Nav marker (`site-header.tsx`) now eases with `SPRING.gentle`
      instead of a plain tween, `duration: 0.01` under reduced motion.
      `npm run typecheck` and `npm run lint` are clean for every file this
      phase touched (remaining errors are pre-existing, in unrelated
      analytics/ripple/three files untouched this session). Homepage,
      `/projects`, and a `/projects/[slug]` detail page all render 200 with
      no console errors after the CSS fix. No browser/screenshot tool was
      available in this environment, so the pointer-tilt and cursor motion
      themselves were verified by code review and the SSR fallback checks
      above, not by an actual pointer interaction or a visual screenshot at
      1440/1024/390 — worth a manual pass in a real browser before calling
      this pixel-verified.

- [~] **Phase 14 — Continuity: the transformation pass.**
      Implement §4's table. Start with Hero → About (shared geometry, real
      disassembly), then About → Skills, then Experience → Contact.
      Skills → Projects last, since Phase 18 will touch its far end.
      *Accept:* scrubbing slowly across every boundary shows one thing
      becoming another — no boundary is a cross-fade.

      **Verified (partial).** Hero → About, About → Skills, and Experience →
      Contact are done; Skills → Projects is intentionally deferred (see
      below), so this phase stays `[~]` rather than `[x]`.
      Two new deterministic geometry helpers went into
      [geometry.ts](src/three/scene/geometry.ts) per §4's "built once,
      referenced by both" rule: `fibonacciSpherePoints()` (a golden-angle
      lattice, replacing an independently-seeded `seededRandom` scatter) and
      `arcSlotPosition()` (the arc About's fragments settle into). Hero →
      About: `hero-sculpture.tsx` now exports a module-scope `heroShellSpin`
      (same pattern as `camera-rig.tsx`'s scratch vectors) so About's shell
      keeps spinning as one object through the split instead of starting its
      own spin from rest; `about-fragments.tsx`'s shards now start on
      `HERO_SCULPTURE_RADIUS`'s own surface via `fibonacciSpherePoints`
      (position *and* normal-derived rotation) instead of an unrelated cloud,
      settle onto `arcSlotPosition()`, and the two end shards bias forward so
      they pass in front of the heading per §4. Appearance-scale (`appear`,
      entry 0→0.12) is now split from the position/rotation lerp
      (`formAmount`, entry 0.05→0.95) — previously one envelope drove both,
      which is why shards visibly grew from nothing instead of reading as an
      already-whole shell breaking apart. About → Skills: `skill-galaxy.tsx`'s
      nodes now start on the same `arcSlotPosition()` arc (plus small jitter)
      instead of an independent radius-3–5.2 spherical cloud, so the lattice
      the fragments snap to *is* the graph's own start state, not a
      coincidentally-similar shape. Experience → Contact:
      `experience-timeline.tsx`'s exit is no longer a uniform group-scale
      shrink; nodes now `flatten` toward the rail's centreline (exit
      0.15→0.85, x/y lerped to 0, z preserved) with a separate `fadeOut`
      (0.85→1) only once flat, reading as "recede and thin... flattens to a
      horizon line" per §4 rather than a shrink-to-origin. The rail's
      `bufferAttribute` and marker positions are now written every frame
      (previously a static `useMemo`'d buffer) so the line stays attached to
      the flattening markers. `contact-calm.tsx`'s core-`settle` window
      shifted from entry 0→1 to entry 0.6→1, so the dodecahedron's rise is
      timed to Experience's flatten/fadeOut climax rather than starting the
      instant Contact's raw span begins — previously the two fades were
      merely scroll-adjacent, not causally linked.
      Skills → Projects is deferred per this phase's own sequencing note,
      to be done alongside/before Phase 18 (the signature moment touches
      Projects' far end).
      `npm run typecheck` and a full `next build` are clean for every file
      this phase touched (remaining errors are the same pre-existing,
      unrelated admin-analytics/settings-form ones Phase 13 already noted).
      No browser/screenshot tool was available in this environment — verified
      by code review, a clean production build, and re-deriving each
      boundary's exact numeric envelope crossover (e.g. Contact's `settle`
      begins right as Experience's `flatten` begins, confirmed by hand against
      `sceneSectionEnvelope`'s formula) rather than an actual scrub-through in
      a browser at 1440/1024/390. Worth a real scrub-test pass before calling
      this pixel-verified.

- [x] **Phase 15 — Scroll physics.**
      Resolve D3 either way and record the result here. If adopting Lenis:
      one raf, `use-scene-progress` reads from it, off under reduced motion
      and on touch.
      *Accept:* scroll feel improves measurably and the profiler shows one
      raf loop, not two — or the dependency is gone.
      **D3: delete** — full reasoning recorded under D3 above. `grep -rn lenis
      src` returns nothing, so removal is a `package.json` line and no code.
      **Closed in Phase 19:** the dependency is actually gone — `grep -n
      lenis package.json package-lock.json` and `ls node_modules/lenis` both
      come back empty. Nothing outstanding.
      Physicality instead comes from **one spring at the source**, new file
      [scroll-physics.tsx](src/three/scene/scroll-physics.tsx): it reads raw
      scroll from `use-scene-progress.ts`, runs it through `SPRING.rail` once
      per frame, and publishes the result to new
      [scene-scroll.ts](src/lib/experience/scene-scroll.ts) as a module-scope
      `sceneScroll.progress`. It is mounted as the **first** child of
      `<Canvas>` at the default priority 0 — R3F ticks equal-priority
      subscribers in mount order, and a positive `renderPriority` would switch
      off automatic rendering — so the spring publishes this frame's value
      before anything below reads it. The DOM text column stays on untouched
      native scroll, so keyboard, find-in-page and anchor jumps are unchanged;
      only the world behind it gains mass.
      The structural consequence: `progress` no longer crosses the React
      boundary at all. It previously flowed `scene-root → scene-canvas →` six
      section-scenes as a prop that changed on every scroll event, re-rendering
      the whole canvas subtree — in direct tension with §8's "no React state
      updates inside `useFrame`". `useSceneProgress()` is replaced by
      `useSceneTone()` (tone is the only value that changes at a rate React
      should see), plus non-React `getSceneProgress()` /
      `subscribeSceneProgress()`. All six section-scenes and all six objects
      now take a literal `sectionIndex` and call
      `sceneSectionEnvelope(sceneScroll.progress, sectionIndex)` inside their
      own `useFrame`. Phase 14's derived crossovers survive exactly: the
      spring applies one uniform, monotonic lag to every consumer, so all
      boundaries shift together rather than relative to each other.
      Three failure modes designed out rather than discovered: `springStep` is
      explicit Euler, which diverges for `dt > 2m/c` — 26.7ms for `SPRING.rail`
      (130/30/0.4), just under `MAX_FRAME_DELTA`'s 33.3ms, so integration
      runs in fixed `1/120` substeps off an accumulator. Reduced motion renders
      `frameloop="demand"`, where there is no frame to integrate in, so that
      path subscribes to raw scroll and snaps + `invalidate()`s instead — which
      is what reduced motion asks for anyway. And the canvas is code-split, so
      it can mount after the reader has already scrolled; a `primed` ref (reset
      whenever `active` flips) seeds the spring at the current target instead of
      springing up from 0 and sweeping the whole story past them.
      Also added to `scene-motion.ts`: `MAX_FRAME_DELTA` and `clampDelta()`,
      replacing the `Math.min(rawDelta, 1 / 30)` that was already inline in
      `project-panels.tsx`.
      `npm run typecheck` and `next build` (✓ compiled in 23.7s) are clean for
      every file this phase touched; `npm run lint`'s 10 errors + 1 warning are
      all pre-existing — each flagged construct
      (`currentPositions.current = nodes.map(…)`,
      `hover.current = slabs.map(…)`, `camera.fov = nextFov`) is present
      verbatim at the same position in `HEAD`, and `scroll-physics.tsx` is
      clean. Remaining typecheck errors are the same pre-existing,
      unrelated admin-analytics/settings-form ones Phases 13 and 14 noted.
      **Not verified, and it needs to be.** No browser/screenshot/profiler tool
      was available in this environment, so the acceptance line's "scroll feel
      improves measurably" and "the profiler shows one raf loop" are both
      unmeasured — argued from the code, not observed. One change in
      particular has to be eyeballed before this is trusted:
      `camera-rig.tsx`'s position and lookAt are now `copy`/`lookAt` outright,
      with the `SCENE_SMOOTHING.glide` damp removed, because `sceneScroll`
      arrives already spring-smoothed and a second filter would stack lag onto
      weight already applied. That is the one edit that changes camera feel
      rather than only its plumbing. Parallax and FOV keep their `cinematic`
      damps. A real scrub-test at 1440/1024/390, light and dark, plus the §12
      control matrix (`three-scene` off, reduced motion, forced `low`,
      WebGL disabled) is still owed.

- [x] **Phase 16 — Skills as a living system.**
      Hover reaction through the Phase 13 store: node approach, neighbour
      drift, edge brightening, ambient slowdown (§6).
      *Accept:* hovering a chip visibly moves the network; releasing settles
      it in ~600ms; no frame-time regression.
      The seam is D1's, exactly as specified: the pill in
      [tech-marquee.tsx](src/components/skills/tech-marquee.tsx) calls
      `publishHoveredSkill(id)` / `clearHoveredSkill(id)`, new writers appended
      to
      [scene-interaction-store.ts](src/lib/store/scene-interaction-store.ts),
      and [skill-galaxy.tsx](src/three/objects/skill-galaxy.tsx) reads
      `hoveredSkillId` with `getState()` inside its own `useFrame`. No React
      subscription, so a hover costs zero re-renders on either side of the
      boundary. Three details in those writers earn their place: `clear` only
      clears if the id is still the hovered one, because moving between two
      pills fires the new pill's `pointerenter` *before* the old pill's
      `pointerleave`; `publish` is gated on
      `matchMedia("(pointer: fine) and (hover: hover)")`, which is §10's "tap
      is not hover, do not fake it" enforced at the source rather than in the
      scene; and `onFocus`/`onBlur` are wired alongside the pointer handlers so
      a keyboard reader gets the same reaction (the marquee's duplicated track
      is not focusable, so only real pills can fire them).
      In the scene, four responses ride on one spring value per node: the
      hovered node lerps `HOVER_APPROACH` (0.15) of the gap toward the camera,
      its two nearest nodes close `NEIGHBOUR_DRIFT` (0.22) on it at
      `NEIGHBOUR_FOCUS` (0.55) of full strength, mesh scale and
      `emissiveIntensity` rise, and the field's ambient drift rate damps to
      `HOVER_AMBIENT_RATE` (0.8) — §6's "everything else slows ~20%", applied
      to the clock rather than the positions so nothing stutters when it
      changes mid-drift. Neighbours are the two nearest in the *settled*
      layout, not in the category chain: the reaction should travel to whatever
      is visibly beside the node.
      **Deviation from the spec, deliberate:** §6 names `SPRING.gentle`, but
      gentle settles in ~270ms (ω≈15.6, ζ≈1.07), which cannot satisfy this
      phase's own "~600ms" acceptance line. Added `SPRING.settle`
      (45/13.5/1, ζ≈1) to [springs.ts](src/lib/experience/springs.ts) instead:
      4/(ζω) ≈ 0.6s to rest, and `2m/c` = 148ms sits far clear of
      `MAX_FRAME_DELTA`, so explicit Euler stays stable without Phase 15's
      substep machinery. `attractors` is retained after release so the
      decaying spring unwinds toward the same anchor it grew from rather than
      snapping to a new one mid-flight.
      Edge brightening is per-vertex colour on the existing `lineSegments`
      (`vertexColors` + an `attributes-color` buffer, both endpoints written
      the same lit value — at this edge length a gradient is invisible and a
      second draw call is not). §8's ceiling is therefore untouched: the whole
      reaction adds **zero** draw calls. Edges also now read the *rendered*
      positions rather than the settled ones, so lines stay welded to nodes
      that have moved.
      Three §8 violations already in this file were removed along the way: a
      `useState` `hoveredIndex` written from inside `useFrame`, a drei `<Html>`
      label, and the `pointer` prop — the galaxy had been faking hover from
      cursor *proximity*, which D1 forbids (the canvas is `pointer-events-none`
      at `z-index: -8` and can never raycast). `pointer` is no longer threaded
      through [skills-scene.tsx](src/three/sections/skills-scene.tsx); it stays
      in `scene-canvas.tsx` for `CameraRig`, Hero and Projects. Per-node
      scratch state moved into one `FrameState` object behind a single ref,
      built and rebuilt **inside** `useFrame` keyed on the `nodes` identity — a
      skills refetch changes the node count, and React's `refs` /
      `immutability` rules reject both the old render-phase ref writes and a
      mutated `useMemo` return. That also clears the one pre-existing
      `currentPositions.current = nodes.map(…)` lint error Phase 15 recorded
      here.
      Ambient bob and hover offsets are applied *on top of* the glide-damped
      base position, never through it, so the release lands on the spring's own
      ~600ms rather than that plus the follow's lag — §8's "never animate one
      property from two systems at once". `worldToLocal` for the camera is
      called once per frame, not per node, and skipped entirely while the group
      is scaling through zero on section exit (a zero-determinant matrix cannot
      be inverted).
      Control matrix: reduced motion takes the DOM highlight only (the scene's
      `interactive` flag is false, so the store is never even read); `low` tier
      is on, since the cost is one spring and one colour lerp per node;
      `three-scene` off and no-WebGL leave the pill's own CSS highlight
      untouched, because the publish is a no-op when nothing is listening.
      `npm run lint` is **clean for every file this phase touched** —
      `skill-galaxy.tsx` included, which it was not at `HEAD`. The remaining 8
      errors + 1 warning are all pre-existing and in untouched files
      (`camera-rig.tsx`, `project-panels.tsx`, `use-css-colors.ts`, and three
      admin files). `next build` compiles ✓ in 34.2s; its typecheck step fails
      only on the same pre-existing admin-analytics/settings-form errors
      Phases 13–15 noted, none in this phase's files.
      **Not verified, and it needs to be.** No browser/screenshot/profiler tool
      exists in this environment, so *every* line of the acceptance criterion
      is argued from the code rather than observed: "visibly moves the network"
      (are 0.15/0.22 readable at the rendered scale, or too subtle?), "settles
      in ~600ms" (the spring's analytic settling time, not a measured one), and
      "no frame-time regression" (unprofiled). The §12 pass is still owed in
      full: 1440×900 / 1024×820 / 390×844, light and dark, a perf trace with
      and without a held hover, and the four control-matrix columns — including
      a real touch device, where the `pointer: fine` gate is the thing being
      tested.

- [x] **Phase 17 — Experience as architecture.**
      Nodes align into structures; the corridor gains vertical stations;
      typography scale is depth-coupled; background layers parallax slower.
      Reuse Phase 12's screen-fraction placement so nothing crosses the text
      column.
      *Accept:* at 1440, 1024 and 390 the section reads as travel through a
      structure, not objects beside a list.
      [experience-timeline.tsx](src/three/objects/experience-timeline.tsx) was
      rewritten rather than extended. What stood there was a wandering rail of
      octahedron markers — the "objects beside a list" the acceptance line
      names. What stands there now is a **station**: a pier on each gutter,
      each carrying a rib that cantilevers *inward* toward the text and stops,
      with a marker where pier meets rib and a rail threading the markers front
      to back. Stations are pitched `STATION_PITCH` (3.1) apart in depth and
      the whole group dollies `TRAVEL_DISTANCE` (2.4) toward the camera across
      the section, so the reader passes through the structure instead of
      watching it sit there. Station count is budget-gated
      (`STATION_LIMIT` = 2 / 3 / 4 by tier), not content-gated: a fifth job
      should not cost a fifth of the frame.
      **"Typography scale is depth-coupled" was ambiguous and the ambiguity was
      put to the author, who chose both readings.** §2 forbids readable text in
      WebGL, so it cannot mean text meshes, and both halves shipped:
      *DOM* — [depth-scale.tsx](src/components/motion/depth-scale.tsx) is a new
      `motion` wrapper that puts a role row on a scroll-bound rake, full size
      across a `[0, 0.32, 0.68, 1]` plateau and receding to `FAR_SCALE` 0.965 /
      `FAR_OPACITY` 0.62 at either end, spring-damped through `SPRING.rail` for
      the reason `<ScrollProgressLine>` is (one trackpad gesture arrives as
      dozens of deltas). It wraps only the *grid* inside each `<li>` in
      [experience.tsx](src/components/sections/experience.tsx) — the `<li>`
      itself and the absolutely-positioned rail node stay outside it, so the
      node can never drift off the rail, and `transformOrigin: left center`
      keeps the column's left edge fixed against it.
      *WebGL* — the stations are proportioned from the page's own type metrics
      rather than from a round number: `TYPE_RATIO` is
      `(1.25rem / 0.6875rem) ^ (1/2)` ≈ 1.348, the geometric step between the
      section's largest (`text-xl`) and smallest (`label-mono`) sizes, and each
      station back is scaled `TYPE_RATIO ^ -index`. The corridor therefore
      recedes on the same ratio the type does.
      **Background layers parallax slower** via two plates (`PLATE_Z` −12.5, a
      floor and a ceiling) that are pushed *backward* by the share of the
      dolly they are not meant to take — `1 − PLATE_PARALLAX_*` — so they
      advance at 0.34 / 0.22 of the corridor's rate without a second scroll
      source. They are skipped entirely on `low`, where two more full-width
      transparent surfaces buy less than they cost.
      **New shared module:**
      [scene-layout.ts](src/lib/experience/scene-layout.ts). Phase 12's
      screen-fraction placement lived as `CONTENT_MAX_PX` / `CONTENT_PAD_PX`
      privately inside `project-panels.tsx`; two corridors now need the
      identical arithmetic, and a second copy is exactly the drift §15's
      "reuse before adding" exists to stop. `contentSafeFraction()` and
      `gutterPixels()` moved there and `project-panels.tsx` now imports them —
      its behaviour is unchanged. Experience uses the measured gutter directly:
      `allowance` ramps the whole treatment in over 70→150px of gutter, so at
      390 there is one station, no travel, and piers pulled to
      `PIER_FRAC_TIGHT` (0.96) where the structure is actually visible, which
      is §10's mobile clause answered by measurement rather than by a
      breakpoint.
      **Two latent defects in the old file were fixed on the way.** It never
      hid itself outside its own span (no `visible` gate at all — it was
      drawing through Projects and Contact); it now early-returns on
      `fade > 0.01`. And it hashed `employmentType` into a hue offset, the
      rainbow §3 forbids: hue is now fixed to the palette and only lightness
      and chroma rake with depth.
      Phase 14's Experience → Contact handoff is untouched *by number*: the
      `0.15 → 0.85` flatten and `0.85 → 1` fade windows are exactly as they
      were, because `contact-calm.tsx` times its dodecahedron rise against
      them. Only the *read* changed — flatten now collapses the piers and
      stretches the ribs into a single horizon line for Contact to rise
      through.
      `ExperienceScene`'s props changed shape (`{palette, budget,
      reducedMotion}` instead of two tone strings), matching `ProjectsScene`;
      [scene-canvas.tsx](src/three/scene/scene-canvas.tsx) updated at the one
      call site.
      §8 held: geometry and materials are memoised on `budget.segments` and
      hand-disposed, nothing allocates per frame, no React state is written
      from `useFrame`, and the added draw calls are 4 per station plus the rail
      plus 2 plates — 15 at `mid`. The two background plates own their
      geometry and material declaratively in JSX with refs rather than through
      a `useMemo`, because `react-hooks/immutability` correctly rejects
      mutating a memoised value from a frame callback.
      `npm run lint` is **clean for every file this phase touched.** The
      remaining errors are pre-existing and in files this phase did not author:
      `camera-rig.tsx` and `project-panels.tsx` (both recorded by Phase 15 —
      `project-panels.tsx`'s two "Cannot access refs during render" errors are
      untouched by this phase's three-line import change), `use-css-colors.ts`,
      and three admin files. `next build` compiles ✓ in 7.0s; its typecheck
      step fails only on the same 15 pre-existing admin-analytics /
      `settings-form` / `ripple-toggle` errors Phases 13–16 recorded, none in
      this phase's files.
      **Not verified, and it needs to be.** No browser, screenshot or profiler
      tool exists in this environment, so the acceptance line — "at 1440, 1024
      and 390 the section reads as travel through a structure" — is argued from
      the code and not observed. The §12 pass is owed in full: 1440×900 /
      1024×820 / 390×844, light and dark, a perf trace, and the four
      control-matrix columns. **One specific risk to look for first:**
      `DepthScale` scales *body text*, and a transform-scale mid-scroll can
      re-rasterise type into soft edges. The range was kept to 0.965 for that
      reason, but 0.965 on a 16px row is the kind of thing that either
      disappears or looks broken, and only a real screen settles which. If it
      reads as blur, drop the scale and keep the opacity rake alone.

- [x] **Phase 18 — The signature moment.**
      §5 in full, including the reduced-motion, low-tier and
      already-seen-this-session variants, and the `three-signature` switch.
      Add GSAP/ScrollTrigger only if pinning proves necessary (D4).
      *Accept:* it plays once, reverses cleanly, never traps the scroll, and
      holds 60fps on `mid`.
      **D4 is answered: no pinning, so GSAP stays out of `src/three`** (§3
      updated). The moment is scrubbed like every other piece of choreography.
      [scene-signature.ts](src/lib/experience/scene-signature.ts) is the beat
      table — §5's 0/600/1100/1500/2600/3200ms stops converted to fractions of
      the moment's own scroll window (0.2→0.86 of the Projects→Experience span,
      after the corridor's dwell and before Experience's entrance finishes) and
      six rows (`takeover`, `push`, `commit`, `hold`, `release`, `dim`) read off
      it with `easeInOutSine` per segment. It is a pure module free of `three`,
      so the DOM side can read it too.
      [signature-moment.tsx](src/three/scene/signature-moment.tsx) runs it once
      per frame and publishes to a module singleton, the same React↔frame-loop
      seam `sceneScroll` uses; it renders nothing. Mounted directly after
      `<ScrollPhysics>`, so consumers below read this frame's spring output and
      the beats derived from it, both already settled.
      The beats are consumed where they belong: the rig
      ([camera-rig.tsx](src/three/scene/camera-rig.tsx)) adds `signature.push`
      as an offset on the path — not a second path, and zero at both ends of the
      window, so the rig stays the only thing deciding camera position;
      [project-panels.tsx](src/three/objects/project-panels.tsx) owns the
      collapse, the covering wall and the shatter;
      [experience-timeline.tsx](src/three/objects/experience-timeline.tsx)
      finishes raising behind the wall so beat 4 opens onto a room that is
      "already lit and waiting" rather than one still assembling itself.
      **The occlusion problem is what shaped the implementation.** The resting
      lead wall sits at `LEAD_Z = -10.5`, *behind* Experience's stations, so
      scaling it up in place could never hide the reveal. During commit it is
      brought to `camera.position.z - COVER_DEPTH` and sized from the **live**
      camera distance — the only way "fills the frame" stays true while the
      camera is still pushing in underneath it — at `COVER_FRAC` 1.45 to swallow
      cursor parallax and the off-square lookAt.
      Two ordinary-choreography conflicts were found and resolved by blending
      rather than by switching: `EXIT_SPAN`'s shutter reaches 1 at ~0.496 of the
      span, mid-commit, so under `takeover` it lerps to a signature-owned
      shutter and the corridor folds *into* the wall instead of being switched
      off; and `PORTAL_RECEDE` would have shoved the wall backward 3.6 units
      exactly as it was meant to come forward, so the resting offset is now
      scaled by `(1 - takeover)`.
      **Variants.** Latched on window entry and released only at either end, so
      a tier step-down or the seen flag cannot swap them mid-play. `full` is the
      five beats with a seeded 5×4 / 4×3 shard break (a grid, not a scatter — a
      surface breaking apart has to have been one surface). `compressed`
      (`low` tier, or already seen) keeps the approach and settle and spends one
      900ms beat on the middle three, no shatter. `dissolve` (reduced motion)
      zeroes `takeover`/`push`/`commit`/`hold`/`release` entirely, so **every
      consumer expression collapses to exactly its pre-Phase-18 behaviour** and
      only a short cross-fade and a partial dim remain. Once per session via
      `sessionStorage`, marked at `t >= 1` where both variants rest on the same
      end state; `readSeen`/`markSeen` are try/catch'd because private mode
      throws.
      The DOM card dim is a CSS custom property (`--signature-dim`) written from
      inside the existing frame loop onto one wrapper in
      [projects.tsx](src/components/sections/projects.tsx), throttled by a 0.004
      epsilon. No second rAF, no React round-trip, and with no scene at all
      `var(--signature-dim, 1)` is what the grid renders at.
      §8 held: `buildShards` is memoised on tier, the `InstancedMesh` is one
      draw call composed through module-scope scratch objects, nothing allocates
      per frame, and the whole path is behind `signature.active` so it costs a
      boolean read outside its window. `npm run lint` is **clean for every file
      this phase touched** — the 8 remaining errors are all pre-existing
      (`camera-rig.tsx` and `project-panels.tsx` from Phase 15,
      `use-css-colors.ts`, `share-donut.tsx`, and the settings page's own prose,
      which this phase's diff did not add to). `next build` compiles ✓ in 3.9s;
      its typecheck fails only on the same pre-existing admin-analytics /
      `settings-form` / `ripple-toggle` errors Phases 13–17 recorded.
      **Not verified, and it needs to be.** No browser or profiler exists in
      this environment, so the acceptance line — "plays once, reverses cleanly,
      never traps the scroll, holds 60fps on `mid`" — is argued from the code,
      not observed. "Never traps" and "reverses cleanly" are structural (a pure
      function of scroll position, with no queue and no pin) and continuity at
      both window edges was checked by hand: at `t >= 1` the ordinary shutter is
      already 1, `takeover` is already 0, and Experience's `raising` is already
      1, so the hand-back is continuous. The two that genuinely need a screen:
      **(1)** whether `COVER_FRAC` 1.45 actually covers at 21:9 and at 390 —
      if Experience shows past the wall's edge the trick dies a beat early, and
      the fix is a wider frac, not a different structure; **(2)** the shatter's
      cost on `mid` at the exact moment the Experience volume is also finishing
      its raise, which is the one frame where both sections are drawing in full.

- [x] **Phase 19 — Atmosphere and reconciliation.**
      The one custom shader (D6); the dust reframe (§8); a final verdict on
      `budget.postProcessing` — consumer or deletion (D5).
      *Accept:* the background reads as depth rather than fog; particle count
      is down and the room looks better; no dead flags remain in `SceneBudget`.

      **The shader (D6).** New file
      [atmosphere.tsx](src/three/scene/atmosphere.tsx): a back-faced sphere
      shell of radius 40 drawn at `renderOrder={-1}` with `depthWrite: false`
      and `frustumCulled={false}`. The fragment stage grades the volume the
      scene sits in — a floor that falls away toward `palette.deep`, an eyeline
      at `palette.horizon`, a lift into `palette.wash` above it, and a
      screen-space vignette that closes the corners so the text column and the
      focal mass keep the open middle §2 asks for. Three choices worth keeping:
      the vignette is `gl_FragCoord.xy / uResolution`, **not** `dot(dir,
      forward)` — a view-angle vignette spans only rim ≈ 0–0.12 at this FOV and
      its width would change as `CameraRig` swings the lens 43°–51°; the shell
      is **transparent** (max α 0.55 dark / 0.40 light, thinnest at frame
      centre) because `AmbientBackground` sits at `z-index: -10` below the
      canvas and has to breathe through; and `dithering: true` plus
      `#include <dithering_fragment>` is there because a gradient this wide and
      this shallow is exactly where 8-bit output bands in visible rings.
      `#include <common>` is explicit above the dither chunk — `<common>` is
      *not* part of a non-raw `ShaderMaterial`'s auto prefix (checked in
      `WebGLProgram.js`), and `dithering_pars_fragment` is built on `rand()`
      from it. Uniforms are mutated through `materialRef.current.uniforms`
      inside `useFrame`, the same escape from `react-hooks/immutability` that
      Phase 17 recorded; colour arrives on `SCENE_SMOOTHING.cinematic` so a
      section boundary cannot flash the room (§7), except on the first primed
      frame and under reduced motion, which have no continuous loop to
      interpolate in.

      **One new derived colour.** `ScenePalette.horizon` in
      [scene-palette.ts](src/lib/experience/scene-palette.ts) — the page
      background stepped one notch *away* (lighter on a near-black page, darker
      on paper, because `#0a0a0a` has nothing below it to recede into).
      Derived from `--bg` alone and never the accent, deliberately: fog colour
      is not frame-damped, so anything accent-linked would snap at every
      section boundary. The fog now fades to `palette.horizon` too, which
      closes the seam Phase 19 set out to fix — before this, the far end of the
      corridor faded to flat `--bg` while the background behind it was painting
      something else.

      **The dust reframe (§8).** `600 / 2200 / 5000` → **`500 / 200 / 80`**, and
      the single shell is now three depth bands (shares 22/34/44; sizes
      0.045 / 0.028 / 0.018; opacity ×1 / ×0.72 / ×0.45; drift ×0.1 / ×0.48 /
      ×1). The near band's 0.1 is the whole point — parallax against a far band
      that does move is what makes the volume read as deep. The bands are
      `fog={false}`: depth is already carried by size, opacity and drift rate,
      and letting the fog eat the far band too would double-count the same
      distance. Three `pointsMaterial`s rather than one because that material
      carries a single size, and the one custom material was already spent.

      **The dead flag (D5): deleted,** with full reasoning under D5 above. Its
      only reader gated Game Mode's halo shell, which now tests
      `budget.tier === "high"` directly.

      **Two contradictions found and fixed on the way.** (1) §9 says the dust
      field is *static* under reduced motion, but `stillBudget` set
      `particles: 0`, which made `environment.tsx`'s `reducedMotion` early
      return dead code and the matrix row a lie. `stillBudget` now clamps to
      the `low` tier's 80 rather than zeroing — a field whose job is grading
      depth does that perfectly well standing still, and `frameloop="demand"`
      means it costs one draw and never ticks again. (2) Phase 15's outstanding
      item was stale: lenis is genuinely gone.

      **Verified.** `npm run typecheck`: zero errors in `src/three`,
      `src/lib/experience`, `src/components/game` and `src/components/skills`;
      the 15 that remain are all pre-existing admin-analytics breakage against
      a `src/lib/analytics/` directory that does not exist on this branch and
      that Phase 19 does not touch. `npm run lint`: **8 errors + 1 warning, the
      exact recorded baseline** — `settings/page.tsx`, `share-donut.tsx`,
      `experience-form.tsx`, `use-css-colors.ts`, `project-panels.tsx`,
      `camera-rig.tsx` — nothing new, and neither new file appears. `npx next
      build`: `✓ Compiled successfully in 4.9s`, so the shader module and both
      dynamic scene chunks bundle; the build's type-check step then fails on
      the same pre-existing admin files. Draw calls: the environment goes from
      1 (one dust object) to 4 (shell + three bands), i.e. **+3 against §8's
      ≤60 ceiling on `mid`** — and `low` pays +2, not +3, because the shell is
      not drawn there. One GLSL bug caught before it shipped: the first draft
      wrote the floor ramp as `smoothstep(0.05, -0.6, y)`, which is undefined
      behaviour for `edge0 > edge1`; it is `1.0 - smoothstep(-1.0, 0.0, y)`.
      A second, subtler one caught by the compiler: back-quoted identifiers
      inside a `/* glsl */` template literal terminate the literal.

      **Not verified, and it matters.** Everything above is static analysis.
      There is no browser and no profiler in this environment, so the three
      judgements this phase actually turns on are all unmade: whether the
      gradient windows (`-1.0 → 0.0` floorward, `0.0 → 0.85` lift) land inside
      the roughly ±0.4 of Y the frame spans at these focal lengths, or whether
      the shell just reads as a flat wall; whether 500 motes at these sizes
      read as *dust in a room* rather than as a thin starfield, which §8
      explicitly says to judge from a screenshot and not a counter; and whether
      the vignette at 0.6 dark / 0.42 light closes the corners or reads as
      dirt. All three are single-constant fixes at the top of
      `atmosphere.tsx` / `environment.tsx`. **Phase 21 must look at this on a
      real page before Act II is called done.**

- [x] **Phase 20 — Drifting objects.**
      Shapes that cross the whole frame on slow lanes in front of the scene,
      and that a mouse can pick up and throw.
      *Accept:* they read as objects sharing the room rather than decoration
      stuck to the glass; they never fight the text column; a press that was
      meant for a link is still a click.

      **Not the gated phase.** The plan's Phase 20 slot was Services (D8), and
      D8 is unchanged — see the note there. This took the number because it was
      next, not because the gate lifted.

      **Where the motion lives.**
      [scene-drifters.ts](src/lib/experience/scene-drifters.ts) is pure TS with
      no `three` import: a `DrifterSpec` per object, every dimension a
      *fraction* — `sizeFrac` and `bobFrac` of half-height, `laneY` a signed
      half-height, `spanX` of half-width. Nothing is a world unit except
      `depth`, so the same spec composes at any viewport. Lanes, depths, sizes
      and spans are authored ladders rather than random draws; only timing is
      seeded. The ladders are ordered so the first three entries — all a `low`
      tier mounts — already compose: both sides of the frame, three depths,
      three different shapes. `|laneY| ≥ 0.34` everywhere keeps the eyeline
      clear, and several `spanX` are `> 1`, which is deliberate: those drifters
      leave frame at the turn and come back, so the sides never look staffed by
      a fixed cast. Two of every five never rotate — §2 forbids "everything
      rotating at once", and a still shard next to a turning one is what makes
      the turning one read.

      **Travel is a sine, not a sweep.** `homeX = sin(t/period + phase) *
      spanX * halfW` with periods of 38–90s. The turn at each end decelerates
      and accelerates by itself, which satisfies §7's no-linear-motion rule
      without a single easing call, and there is no seam to hide because the
      path has no ends. A slower bob on its own period keeps the two axes from
      ever locking into a visible ellipse.

      **Screen-fraction placement, exactly.** The group copies the camera's
      position and quaternion each frame (damped on `SCENE_SMOOTHING.drift`,
      snapped on the first frame and under reduced motion), so its children's
      local coordinates *are* camera space and `halfAtUnit = tan(fov/2)` is the
      whole placement maths — Phase 12's method, now applied to a camera that
      swings x ±1.35 and the lens 43°–51° underneath them. Without this the
      lanes would drift off the frame edges every time `CameraRig` moved.

      **The grab, and why it is not a raycast.** D1 stands: no raycaster, no
      `pointer-events` change, no restack. A `window` `pointerdown` — passive,
      never `preventDefault`ing — sets a module singleton
      ([scene-pointer.ts](src/lib/experience/scene-pointer.ts)) and stamps a
      counter so `useFrame` can tell a *new* press from a held one. On that
      edge the frame loop projects each drifter to NDC
      (`group.localToWorld(...).project(camera)`), corrects for aspect, and
      takes the nearest within `sizeFrac * 1.6 + 0.035`. Three things make it
      safe to hang off the whole window: the press is disowned if
      `event.target.closest('a, button, input, …')` matches, so a click on a
      link stays a click; touch pointers and non-primary buttons are dropped at
      the source; and `pointerup`, `pointercancel` and `blur` all release, so
      an alt-tab mid-drag cannot strand the page in a grab.

      **Dragging and release.** The cursor is turned back into a point at that
      drifter's own depth in true camera space and brought into group space,
      then a `snappy` spring chases it — a spring, not an assignment, so a fast
      flick lags and the object has weight. On release the same offset springs
      to zero on `settle`, which means the throw's momentum carries first and
      the arc back to the lane is a curve, not a snap. Both springs are inside
      explicit-Euler's stability limit at `clampDelta`'s worst frame
      (`snappy` → 0.057s, `settle` → 0.148s, cap 0.033s).

      **They cross the text, they do not stop at it.** `contentSafeFraction`
      from [scene-layout.ts](src/lib/experience/scene-layout.ts) — the same
      measure the camera and the atmosphere use — smoothsteps opacity down to
      `COLUMN_FLOOR` 0.12 as a drifter enters the reading column, and back up
      in the gutter. The floor is not zero on purpose: blinking out at the
      column edge would read as a bug, while a shape that dims and passes
      behind reads as depth. Typography stays king (§2) without the lane having
      to dodge.

      **Wiring.** `three-drifters` in `ANIMATION_IDS` with a row in
      `/admin/settings`, subordinate to `three-scene` (§9). Mounted last inside
      `<Canvas>`, after `CameraRig`, so it copies *this* frame's camera rather
      than last frame's — that ordering is what keeps a dragged object under
      the cursor. It reads `scene-signature`'s `hold` and `dim`, so the
      signature moment's stillness beat stops the lanes dead instead of leaving
      them sliding through it. Geometries and materials are memoised on
      `budget.segments` and disposed on unmount; per-frame mutation goes
      through refs, which is the `react-hooks/immutability` escape Phase 17
      recorded and Phase 19 reused.

      **Verification.** `npm run typecheck`: **15 errors, all pre-existing** —
      the same `admin/analytics` imports of a `src/lib/analytics/` that does not
      exist, plus `settings-form.tsx`'s `phone` field; none in the new files.
      `npm run lint`: **8 errors + 1 warning, the same baseline as Phase 19** —
      `drifters.tsx` and the three new lib files are clean, which took moving
      the runtime array and the material handle behind refs. `npx next build`:
      **compiles successfully in 4.8s**, then fails type checking on those same
      15 pre-existing errors — a broken build this phase did not break and does
      not fix. **Not yet judged on a real page:** whether eight objects is
      generous or busy at `high`, and whether `COLUMN_FLOOR` 0.12 is the right
      floor, are screenshot questions. **Phase 21 owns both.**

- [ ] **Phase 21 — Creative-direction review.**
      Not a compile check — §13 run as a director, on the real rendered page.
      Fix what fails before calling Act II done.

---

## 12. Verification protocol

Compiling is not evidence. Every phase from 14 onward is verified on the
**rendered page**, the way Act I's Phase 12 caught a composition that was
correct in code and wrong on screen.

1. Run `next dev`; drive a real browser over the Chrome DevTools Protocol.
2. Screenshot each affected section at **1440×900, 1024×820, 390×844**, in
   light and dark, at rest and mid-transition.
3. Capture a performance trace while scrolling the whole page; check long
   frames and draw calls against §8.
4. Re-run with each control-matrix column: `three-scene` off,
   `prefers-reduced-motion: reduce`, a forced `low` tier, and WebGL disabled.
5. `npm run typecheck && npm run lint` last, not first.

Paste the numbers that changed into the phase's note. "Looks good" is not a
verification.

---

## 13. Quality bar

Ask these as a creative director, not as an engineer:

Does it feel like **one world**? Does scrolling feel physical? Does the camera
tell a story, or just move? Is every section boundary a transformation rather
than a fade? Do the project cards feel like objects? Is the lighting coherent
across sections? Are the materials believable? Is there enough negative space?
Are there real moments of silence? Is there one moment worth remembering? Does
each section have its own interaction language? Does the 3D serve the content
or compete with it? Is the typography still dominant? Is mobile a composition
of its own? Does the animation toggle actually save work? Does reduced motion
produce a considered alternative rather than an empty page? Does WebGL failure
degrade to something that still looks intentional? Is the site still fast?

Any "no" is a defect. Fix it in the phase that owns it.

---

## 14. Non-goals and risks

**Non-goals.** Sound (§35). A second canvas. Physics engines outside Game Mode.
An effect stack. Replacing Motion for DOM work. Rewriting Act I because a
different architecture would be tidier. Inventing content to justify geometry.

**Risks, and the early warning for each:**

| Risk | Warning sign | Response |
|---|---|---|
| Transformation pass destabilises working sections | A boundary looks better, an adjacent section looks worse | One boundary per commit; screenshot both neighbours. |
| Signature moment traps or disorients | Reverse-scroll behaves oddly; testers scroll past it twice | Ship the scrubbed version; never autoplay. |
| Motion creep — everything moving | Frames with no quiet region | Re-read §2's intensity table; cut the lowest-value motion. |
| Perf decay by accumulation | Each phase costs 2ms, and nobody measures | §12 step 3 every phase, not at the end. |
| Two scroll sources after Lenis | Values disagree by a frame; jitter under fast scroll | Closed by Phase 15: Lenis rejected, and `sceneScroll.progress` is written by exactly one `useFrame`. |

---

## 15. Conventions for this work

- **Comments are short and to the point.** State the non-obvious *why* in one or two lines. Act I's long explanatory blocks stay as they are; new code does not add more of them.
- Strict TypeScript; no `any`.
- Reuse before adding: `scene-motion.ts`, `springs.ts`, `scene-palette.ts`, `device-tier.ts`, `variants.ts`. A new constant that belongs in one of those goes there.
- No new dependency without a line in this file explaining why the existing stack could not express it.
- Update this file in the same session as the code it describes.
