# section-scenery

A canvas backdrop that gives every section of the site its **own animation**, not
its own colour. Six sections, six different shapes of motion — plus four stages a
case study moves through.

| Tone         | What it does                                          | Silhouette          | What the reader does to it              |
| ------------ | ----------------------------------------------------- | ------------------- | --------------------------------------- |
| `hero`       | Slow swells under a low sun                            | Horizontal          | Gusts the swells; the sun trails behind |
| `about`      | A field growing up out of the fold, biased right       | Vertical            | Parts the stalks; they spring back      |
| `stack`      | A network with a signal sweeping through it            | Scattered           | Joins the graph; scroll sends the sweep |
| `work`       | Rails converging, markers arriving fast then settling  | Converging depth    | Turns the camera; scroll speeds arrival |
| `experience` | Threads writing themselves left to right, under rain   | Sequential, dashed  | Plucks one thread; the rain only leans  |
| `contact`    | Fireflies rushing in and coming to rest under a moon   | Rising points       | Calls the fireflies over                |

The case study adds four more, in `scenes/story-scenes.ts`. These are not six
unrelated places the way the landing sections are — they are four states of one
room, and the order is the story's:

| Tone              | Act                  | What it does                                          |
| ----------------- | -------------------- | ----------------------------------------------------- |
| `story-open`      | Overview             | Rails again, but slower and higher — the road in       |
| `story-tension`   | Problem, challenges  | Swells inverted to hang overhead, dim and slow         |
| `story-structure` | Approach → screens   | A graph with long links and a slow sweep               |
| `story-clarity`   | Results, pager       | One wide low swell under a centred light               |

Four, not seven: a backdrop that changed on every heading would be a slideshow.
`components/projects/story-stage.ts` maps chapter ids onto them, and the chapter
`<section>` carries `data-tone`/`data-tone-anchor` so the observer in
`ambient-background.tsx` drives the change — the case study adds no observer, no
scroll handler and no second loop.

Two tests the set is designed to pass:

1. **Turn the colour off and they are still six different things.** A recolour of
   one animation would fail it.
2. **Move the pointer and each section answers with a different verb.** Six
   copies of "things drift toward the cursor" would fail it just as badly.

## Layout

```
engine/
  math.ts         clamp/lerp/approach/smoothstep/falloff — no imports, no state
  noise.ts        seeded value noise (1D + 2D) and fbm1
  input.ts        one pointer + scroll tracker, read once per frame
  scene.ts        the Scene / SceneFrame contract and composeScene
  tone-color.ts   reads --tone / --tone-soft out of globals.css; theme watcher
  loop.ts         the single rAF loop — sizing, cross-fade, frame budget
primitives/       seven drawable pieces, each one gesture
scenes/           six compositions of those pieces + the SCENES record
section-scenery.tsx  the client component
```

## How it is wired

One line, in `src/components/layout/ambient-background.tsx`:

```tsx
<div aria-hidden="true" className="ambient" data-tone={tone}>
  <SectionScenery tone={tone} />
  …the existing blobs, rays and stars…
</div>
```

That is the only edit outside this folder. `globals.css` is untouched — the
canvas is positioned with Tailwind utilities and inherits `.ambient`'s fixed,
full-bleed, `pointer-events: none` box.

## Things worth knowing before changing it

- **No new dependency.** Canvas2D and `requestAnimationFrame`. `motion` stays the
  only animation package in `package.json`.
- **The tone is a prop, not an observation.** `ambient-background.tsx` owns the
  `IntersectionObserver`, including the fix that stops a previous route's tone
  sticking. A second observer here would be a second chance to get that wrong.
- **Colours are read once, off a probe.** `--tone` is a registered `@property`
  with a 900ms transition, and registered colours interpolate in **oklab** — so
  reading it off `.ambient` mid-transition returns `oklab(…)`, not `rgb(…)`. A
  throwaway `<span>` carrying `data-tone` never transitions (`transition` is not
  inherited) and gives the stylesheet's own sRGB values. Read once at mount,
  re-read when `.dark` flips.
- **Reduced motion returns `null`.** The reduced-motion block in `globals.css`
  stops the CSS layers, but a stylesheet cannot stop a rAF loop. The gate is
  `useMotionPreference()` in the component.
- **Scenes draw in CSS pixels.** `loop.ts` applies the device pixel ratio through
  `setTransform`, so no primitive multiplies by `dpr` or knows the current
  quality factor.
- **Quality only falls.** If the average frame runs over budget the loop drops a
  step and never climbs back — a loop that recovered would oscillate visibly.
- **Density is a starting budget, not a second quality system.** `use-density.ts`
  picks one of four tiers (`full`/`moderate`/`sparse`/`minimal`) from the
  viewport width and `navigator.deviceMemory`, the same signals and threshold
  `living-river/use-eligible.ts` uses for its own gate. `engine/density.ts`'s
  `scaleCount` scales each scene's element counts by tier — never speed, radius,
  or anything else that would change what a scene *is* — and `initialQuality`
  seeds `loop.ts`'s existing `quality` variable at a lower starting point on a
  cheaper tier. The frame-cost sampler still runs on top and still only ever
  drops further; there is one `quality` value, set from two places, never two
  competing ones. `section-scenery.tsx` reacts to a tier change (a breakpoint
  crossed, or the client correcting the server's optimistic `full` guess) by
  rebuilding the current scene through the loop's ordinary cross-fade — the rAF
  loop itself is never restarted.
- **Input is read once per frame, in the loop.** `loop.ts` calls
  `input.read(dt, w, h)` and passes the result into both the outgoing and the
  incoming scene. Six primitives adding their own listeners would mean six
  `pointermove` handlers competing for the same main thread.
- **Nothing eases by `* 0.1` per frame.** Use `approach(current, target, tau, dt)`
  — the exponential form, which lands on the same curve at 60Hz and at 144Hz.
  `dt` itself is blended in the loop, because rAF hands back 15ms and 18ms gaps
  back to back and that shows up as tremor on slow wide motion.
- **Attraction is an offset, not a force — except where there is damping.**
  Constellation nodes and stalks carry an eased displacement that springs back to
  zero; adding acceleration to an undamped body means the system quietly heats up
  over a long visit. Fireflies are the exception: they damp, so they get a real
  force.
- **Motion comes from noise, not sines.** A sine repeats exactly and the eye
  locks onto the period within about ten seconds. `fbm1` in `noise.ts` is two
  octaves, the second offset so they never line up.
- **No pointer is a supported case.** With no mouse, `presence` decays and
  `input.ts` blends in a slow noise wander, so a touch reader sees a backdrop
  that still moves — just one nobody is steering.
- **`night-accents.ts` could not be reused.** A `RiverLayer` is
  `{ css, mount(root) }`; it hands out DOM nodes and has nothing to give a
  `CanvasRenderingContext2D`. The motifs carried over, the code did not.

## Adding a section

Add the tone to `SECTION_TONES` and its colours to `globals.css`, then add a
factory to `scenes/index.ts`. That record is a total `Record<SectionTone, …>`, so
forgetting the second half fails the build instead of shipping a blank backdrop.
