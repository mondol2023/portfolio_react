# Living river

A river you are travelling down, rendered per pixel, that responds to the
reader. It is the replacement for `features/river-scenery` — not an edit of it.
The two live side by side, one switch chooses between them, and neither knows
the other exists.

## Why a second folder instead of a rewrite

The brief was "the scrolling animation isn't good enough." The honest answer
was that the CSS scene had gone as far as its medium goes: gradients and
transforms can fake depth, but they cannot be lit, they cannot be looked
*through*, and nothing in them can notice the pointer. Getting further meant a
different technique, and a different technique in the same files would have
meant a period where the site's only backdrop was half-migrated. So this is a
parallel implementation with its own admin switch, and `river-scenery` is still
on disk, still working, still the default.

## The switch

`content/scenery` in Firestore, one boolean field, `livingRiver` — its own
document rather than another row in `content/animations`, because the surprise
button rolls that list at random and a full-viewport WebGL scene is not
something that should ever arrive unannounced on top of another backdrop.

- `lib/firebase/repositories/scenery-repository.ts` reads it (`cache`d per
  request) and writes it. **On** is the default and the failure mode (Phase 4
  of `docs/plan.md` promoted it from off): no Firebase, or a thrown query,
  yields the registry's default state — living river permitted,
  `section-scenery` off — rather than no page. That default is only ever
  *permission*, not a guarantee: see "Who actually gets it" below.
- `lib/actions/scenery-actions.ts` — `withAdmin`-guarded Server Action, then
  `revalidateScenery()`. (Cache Components is off in this project, so that is
  `revalidatePath`, not `cacheTag`.)
- `components/admin/site-layer-toggles.tsx` — one row in the dashboard's "Site
  scenery" list, optimistic, `router.refresh()` afterwards. The row declares
  `conflicts: ["section-scenery"]` in `components/surprise/site-layers.ts`, so
  switching it on takes the section canvas down in the same write.
- `app/(site)/layout.tsx` hands both flags to `components/layout/scenery-gate.tsx`
  rather than picking between them itself — see the next section.

## Who actually gets it

The Firestore flag says the *site* is allowed to show the living river; it
does not say this *visitor* can run it. `SceneryGate` answers that second
question, client-side, with `use-eligible.ts`'s
`useLivingRiverEligible`: a desktop-sized viewport with a pointer that can
hover (excludes touch tablets a width check alone would not), a real WebGL2
context — not just the viewport check — obtained the same way the renderer
itself would, `deviceMemory` read as a supporting signal where the browser
exposes it, and `prefers-reduced-motion` honoured before any of the above even
runs. Whenever the answer is "no" — mobile, tablet, no WebGL2, reduced motion,
a low-memory device, or the admin flag itself is off — `SectionScenery` is
what renders instead, exactly as if `section-scenery` had been the one turned
on: this is the fallback for all of those cases, not only the admin's kill
switch. The heavy renderer is also `next/dynamic`-loaded from `SceneryGate`
with `ssr: false`, so none of its JS reaches a visitor the check above turns
away. A second, narrower version of the same WebGL2 probe runs again in
`living-river-backdrop.tsx` immediately before the real mount; failing it
falls back to `SectionScenery` the same way, for the rarer case where the
answer changes in the moment between the two checks.

## How it is put together

Two canvases in one mounted layer, stacked, driven by one clock:

- **`gl/`** — a fullscreen triangle whose fragment shader ray-marches the sky
  and intersects the water plane at `y = 0` per pixel. GLSL ES 1.00, so the same
  source compiles on WebGL2 and WebGL1; `gl/context.ts` returns `null` rather
  than throwing when there is no context at all, and the caller stands down.
  `powerPreference: "low-power"` — a backdrop has no business waking a laptop's
  discrete GPU.
- **`sprites/`** — a 2D canvas for everything with an edge: the bank and its
  skyline, boats, egrets, foreground reeds, splashes, fireflies. Painter's order
  by `SpriteLayer.order`, `update` for every layer before `draw` for any, so a
  bird startled by the pointer and the splash that same pointer made are looking
  at the same instant.
- **`core/`** — the state both renderers read.

The two agree because they are not two scenes. The wave table in `core/water.ts`
is used directly by TypeScript *and* emitted as GLSL from the same table
(`WATER_GLSL` — `lr_swell`, `lr_ripples`, `lr_height`, `lr_normal`), which
`gl/shaders.ts` interpolates into the fragment shader. So a
boat floats on exactly the surface the shader drew under it. `core/camera.ts`'s
`project` and `unprojectToWater` are exact inverses of each other and of the
shader's ray setup, which is why a sprite lands where the water it is standing
on actually is.

## One light

`core/lighting.ts` derives a single lighting model from the same `SkyState` the
shader is handed: key/fill/ambient, back-lighting, rim, cast-shadow projection
onto the water plane, wave self-shadowing, ambient occlusion, sub-surface
scattering, crepuscular rays, vignette, a night floor.

The organising fact is in `core/day-cycle.ts`: the sun's `z` is hard-coded
positive, so it is always somewhat *ahead* of the camera. The river is
permanently back-lit. That single decision is what makes the scene read —
objects sit as near-silhouettes with a burning edge, spray becomes the brightest
thing in frame (a drop of water with the sun behind it is a lens, which is why
`splashes.ts` draws its halo with `globalCompositeOperation = "lighter"`), and
every shadow falls toward the bottom of the frame, toward the reader. If the
shader and the sprites disagreed on that direction by so much as a sign, the
scene would come apart in a way a reader feels before they can name it.

## What makes it interactive

- **Scroll has direction and momentum.** `core/world.ts` turns scroll velocity
  into a signed surge with a fast attack and a slow release, which drives the
  current, the camera's pitch, and eye height. Scrolling back does not rewind
  the world — `flow` is floored at `0.22`, so it reads as losing way.
- **The channel meanders**, keyed on distance travelled rather than on time, and
  the bow follows the bend: the yaw target includes the derivative of the
  meander, so the camera turns *into* the corner instead of crabbing through it.
- **The pointer is a thing in the world.** It is unprojected onto the water, so
  reeds part around it, egrets above it climb and scatter, and a tap throws a
  real ripple into the shared height field — which the shader then lights,
  because it is the same field.
- **The day runs on scroll.** `sampleDayCycle` interpolates eight keyframes with
  a phase-reparameterised cubic Hermite rather than a linear blend, so the light
  never visibly hesitates at a keyframe. (Uniform Catmull-Rom is only C¹ when
  the segments are equal width, and these are not: 0.14, 0.13, 0.15, 0.10, 0.10,
  0.14, 0.16, 0.08.)

## Two things the browser will not tell you

Both were found by simulating the journey rather than by looking at frames, and
both are the kind of bug that only appears once scroll actually *means*
something:

- **A resize is not a scroll.** Rotating a phone can move the scroll *fraction*
  by a third without the reader having moved at all; read naively that is an
  enormous velocity, and the river answers a device rotation with a surge.
  `core/input.ts`'s `onResize` re-reads the position and throws the difference
  away.
- **There is no "scrolling has stopped" event.** The last event of a flick
  reports a large speed and then nothing further ever arrives, so a reading
  taken at face value stands forever and the river runs hard for as long as the
  tab is open. `world.ts` ages the reading (`scrollSeen` / `scrollPush`) instead
  of believing it. The decay lives on the world, not on the input, because a
  consumer must not mutate its producer.

## Behaviour and cost

- `core/clock.ts` clamps `dt` (a throttled tab resumes, it never teleports),
  pauses entirely while the document is hidden, and trades render scale
  (0.5–1.0) against a rolling average of frame cost.
- `prefers-reduced-motion` drops the scene outright rather than freezing it — an
  arbitrary single frame of a day-cycle is not a design, and a reader who asked
  for less movement should not get the most animated thing on the page.
- A wrapper mask fades the scene out at the top and bottom of the viewport,
  where the headings and body copy are, and lets only the horizon band through
  at full strength.

## Testing

There is no browser in CI, and the parts worth testing are properties of the
*journey*, not of a frame: that the current never reverses, that scrolling
changes the speed at all, that the channel wanders without ever putting the
camera through a bank, that a stale scroll reading decays, that the ripple pool
never grows. Those run headless against `createWorld`/`updateWorld` with a fake
`Input`, which is also what caught the mutation bug above.
