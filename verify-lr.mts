/* Offline checks for the parts of living-river that do not need a GPU. */

import { project, unprojectToWater, horizonY, type Camera } from "./src/features/living-river/core/camera";
import { sampleDayCycle } from "./src/features/living-river/core/day-cycle";
import { waterHeight, waterSlope, WATER_GLSL, MAX_RIPPLES, RIPPLE_LIFE } from "./src/features/living-river/core/water";
import { createWorld, updateWorld, spawnRipple } from "./src/features/living-river/core/world";
import type { Input } from "./src/features/living-river/core/input";

let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

// ---------------------------------------------------------------- camera ----

console.log("camera");

const W = 1440;
const H = 900;

const cams: Camera[] = [
  { x: 0, y: 2.05, z: 0, yaw: 0, pitch: -0.015, fov: 0.62 },
  { x: 12, y: 1.7, z: 340, yaw: 0.09, pitch: -0.07, fov: 0.62 },
  { x: -30, y: 2.6, z: -55, yaw: -0.12, pitch: 0.03, fov: 0.5 },
];

let worstRoundTrip = 0;

for (const cam of cams) {
  for (let sx = 40; sx < W; sx += 137) {
    for (let sy = 0; sy < H; sy += 47) {
      const hit = unprojectToWater(cam, sx, sy, W, H);
      if (!hit) continue;

      const back = project(cam, hit.x, 0, hit.z, W, H);
      if (!back) {
        check("unproject → project stays in front of the lens", false, `${sx},${sy}`);
        continue;
      }
      worstRoundTrip = Math.max(worstRoundTrip, Math.hypot(back.x - sx, back.y - sy));
    }
  }
}

check(
  "project is the exact inverse of unprojectToWater",
  worstRoundTrip < 0.001,
  `worst error ${worstRoundTrip.toFixed(6)} px`,
);

/*
 * A ray aimed at the horizon line is the boundary case: below it hits water,
 * above it misses.
 *
 * The margin has to clear `unprojectToWater`'s own guard, which rejects rays
 * within 0.02 of horizontal because their intersection lands thousands of
 * units away and is numerically meaningless. At this field of view that guard
 * is about fifteen pixels deep, so six pixels — the obvious number — tests
 * inside the dead band and fails on correct code.
 */
for (const cam of cams) {
  const hy = horizonY(cam, H);
  const below = unprojectToWater(cam, W / 2, hy + 30, W, H);
  const above = unprojectToWater(cam, W / 2, hy - 2, W, H);
  check(`horizonY brackets the water plane (pitch ${cam.pitch})`, below !== null && above === null);
}

// --------------------------------------------------------------- daylight ----

console.log("day cycle");

let dayFinite = true;
let dayInRange = true;
let maxJump = 0;
let maxKink = 0;
let previousStep: number[] | null = null;
let previous = sampleDayCycle(0);

const STEPS = 40000; // two full days at 1/20000 each

for (let i = 1; i <= STEPS; i += 1) {
  const phase = i / (STEPS / 2); // two full days, so the midnight→sunrise wrap is covered
  const sky = sampleDayCycle(phase);

  const numbers = [
    ...sky.zenith, ...sky.horizon, ...sky.sunTint,
    ...sky.waterDeep, ...sky.waterShallow, ...sky.fog, ...sky.cloudTint,
    ...sky.sunDir, ...sky.moonDir,
    sky.cloudDensity, sky.sunUp, sky.night,
  ];

  if (numbers.some((n) => !Number.isFinite(n))) dayFinite = false;
  if ([...sky.zenith, ...sky.horizon, sky.sunUp, sky.night].some((n) => n < -0.001 || n > 1.001)) {
    dayInRange = false;
  }

  const len = Math.hypot(...sky.sunDir);
  if (Math.abs(len - 1) > 1e-6) dayInRange = false;

  const step = [
    // Two channels that never come near 0 or 1, so the smoothness being
    // measured is the spline's and not `clamp01`'s. A channel that clips —
    // the horizon's blue peaks at 0.96 and the spline lifts it over 1 — has a
    // kink at the clip by construction, and that kink is wanted: it is a
    // blown highlight, which is a real thing light does.
    sky.zenith[0] - previous.zenith[0],
    sky.zenith[2] - previous.zenith[2],
    sky.horizon[2] - previous.horizon[2],
    sky.night - previous.night,
  ];

  maxJump = Math.max(maxJump, ...step.map(Math.abs));

  /*
   * The second difference. A jump shows up in the first difference; a *kink* —
   * the colour changing at one rate and then abruptly at another, which is
   * what linear interpolation between keyframes produces — only shows up here,
   * and is the thing the Catmull-Rom ramp exists to remove.
   */
  // Colours only. `night` is a deliberately steep sigmoid — dusk is quick —
  // and its curvature would drown out the thing being measured here.
  if (previousStep) {
    for (let k = 0; k < 2; k += 1) {
      maxKink = Math.max(maxKink, Math.abs((step[k] as number) - (previousStep[k] as number)));
    }
  }

  previousStep = step;
  previous = sky;
}

check("every sampled value is finite", dayFinite);
check("colours stay in 0..1 and sunDir stays unit length", dayInRange);
// The bound scales with the sampling interval, which is the point: a genuine
// jump would not shrink when the sampling gets finer, and a steep-but-smooth
// ramp — which `night` is — does.
check("no discontinuity across the day, midnight wrap included", maxJump < 0.004, `max step ${maxJump.toFixed(6)}`);
check("the colour ramp has no kinks at the keyframes", maxKink < 1e-6, `max kink ${maxKink.toExponential(2)}`);

// ------------------------------------------------------------------ water ----

console.log("water");

const ripples = [
  { x: 3, z: 14, age: 0.4, strength: 1 },
  { x: -8, z: 40, age: 2.9, strength: 0.4 },
];

let waterFinite = true;
let maxAmplitude = 0;

for (let i = 0; i < 4000; i += 1) {
  const x = (i % 97) - 48;
  const z = (i % 233) * 0.9;
  const t = i * 0.017;
  const h = waterHeight(x, z, t, 1.4, ripples);
  const s = waterSlope(x, z, t, 1.4, ripples);
  if (!Number.isFinite(h) || !Number.isFinite(s.dx) || !Number.isFinite(s.dz)) waterFinite = false;
  maxAmplitude = Math.max(maxAmplitude, Math.abs(h));
}

check("height and slope are finite everywhere sampled", waterFinite);
check("swell stays within a plausible amplitude", maxAmplitude < 0.5, `max |h| ${maxAmplitude.toFixed(3)}`);

// The GLSL is generated, so the thing worth checking is that generation, not
// the maths: balanced braces, no bare integer literals where a float is needed.
const braces = [...WATER_GLSL].reduce((n, c) => n + (c === "{" ? 1 : c === "}" ? -1 : 0), 0);
const parens = [...WATER_GLSL].reduce((n, c) => n + (c === "(" ? 1 : c === ")" ? -1 : 0), 0);
check("generated GLSL has balanced braces and parens", braces === 0 && parens === 0);
check("generated GLSL declares the ripple array at the shared size", WATER_GLSL.includes(`uRipples[${MAX_RIPPLES}]`));

const badLiterals = WATER_GLSL.match(/(?<![\w.])\d+(?![\w.])/g)?.filter((n) => n !== "0" && n !== "1" && n !== "2" && n !== "3" && n !== "8");
check("no bare int literals in float expressions", !badLiterals || badLiterals.length === 0, String(badLiterals));

// ------------------------------------------------------------------ world ----

console.log("world");

const world = createWorld();

let scroll = 0;
let velocity = 0;
const touches: { x: number; y: number; strength: number }[] = [];

const input: Input = {
  state: {
    pointerX: W / 2,
    pointerY: H * 0.62,
    hasPointer: true,
    get scroll() { return scroll; },
    get scrollVelocity() { return velocity; },
  },
  drainTouches() {
    const drained = touches.splice(0, touches.length);
    return drained;
  },
  dispose() {},
} as unknown as Input;

let worldFinite = true;
let cameraStayedAbove = true;
let phaseInRange = true;
let sawRipple = false;

for (let frame = 0; frame < 60 * 600; frame += 1) {
  // Ten simulated minutes, with the reader scrolling back and forth.
  scroll = 0.5 + 0.5 * Math.sin(frame / 900);
  velocity = Math.cos(frame / 900) / 1800;

  if (frame % 90 === 0) touches.push({ x: W * 0.4, y: H * 0.7, strength: 1 });

  updateWorld(world, input, 1 / 60, W, H);

  if (world.ripples.some((r) => r.strength > 0)) sawRipple = true;

  const numbers = [world.time, world.wind, world.flow, world.scroll, world.phase, world.cam.x, world.cam.y, world.cam.z, world.cam.yaw, world.cam.pitch];
  if (numbers.some((n) => !Number.isFinite(n))) worldFinite = false;
  if (world.cam.y < 0.5) cameraStayedAbove = false;
  if (world.phase < 0 || world.phase >= 1) phaseInRange = false;
}

check("ten simulated minutes produce no NaN", worldFinite);
check("the camera never sinks below the surface", cameraStayedAbove, `y = ${world.cam.y.toFixed(3)}`);
check("phase stays wrapped into 0..1", phaseInRange);
check("taps actually created ripples", sawRipple);
check("wind stays in a sane band", world.wind > 0.3 && world.wind < 4, `wind ${world.wind.toFixed(3)}`);
check("the camera really travelled downstream", world.cam.z > 300, `z ${world.cam.z.toFixed(1)}`);

console.log("travel");

/*
 * A long voyage with the reader working the page back and forth.
 *
 * Everything here is a property of the *journey* rather than of a frame:
 * whether the current can be made to run backwards, whether scrolling changes
 * anything at all, and whether the channel wanders without ever putting the
 * camera through a bank. None of it can be seen in a screenshot, which is
 * exactly why it is worth asserting.
 */
const travel = createWorld();

let surgeFinite = true;
let flowWentNegative = false;
let camDriftedOffChannel = false;
let maxDrift = 0;
let minFlow = Infinity;
let maxFlow = -Infinity;

for (let frame = 0; frame < 60 * 400; frame += 1) {
  scroll = 0.5 + 0.5 * Math.sin(frame / 1200);
  velocity = (Math.cos(frame / 1200) / 1200) * 60;

  updateWorld(travel, input, 1 / 60, W, H);

  if (!Number.isFinite(travel.surge) || !Number.isFinite(travel.cam.x)) surgeFinite = false;
  if (travel.flow < 0) flowWentNegative = true;
  // The banks stand at x = +/-44; anywhere near them and the meander is a bug.
  if (Math.abs(travel.cam.x) > 30) camDriftedOffChannel = true;
  maxDrift = Math.max(maxDrift, Math.abs(travel.cam.x));
  minFlow = Math.min(minFlow, travel.flow);
  maxFlow = Math.max(maxFlow, travel.flow);
}

check("surge and lateral drift stay finite", surgeFinite);
check("the current never reverses", !flowWentNegative, `min flow ${minFlow.toFixed(3)}`);
check("scrolling actually changes the speed", maxFlow - minFlow > 0.4, `span ${(maxFlow - minFlow).toFixed(3)}`);
check("the camera stays inside the channel", !camDriftedOffChannel, `max |x| ${maxDrift.toFixed(2)}`);
check("the channel really meanders", maxDrift > 2, `max |x| ${maxDrift.toFixed(2)}`);

/*
 * And then the reader stops.
 *
 * The browser sends no event for that, so the last velocity reported stands
 * until something ages it. If nothing does, a single flick leaves the river
 * running hard for as long as the tab is open — which looks fine for a second
 * and wrong for a minute. Scroll is held still here while the stale reading is
 * left deliberately large.
 */
const coast = createWorld();
scroll = 0.5;
velocity = 1.2;
updateWorld(coast, input, 1 / 60, W, H);
const surgeAtRelease = Math.abs(coast.surge);
for (let frame = 0; frame < 60 * 6; frame += 1) updateWorld(coast, input, 1 / 60, W, H);

check("a stale scroll reading does not drive the river forever", Math.abs(coast.surge) < surgeAtRelease * 0.1, `surge ${surgeAtRelease.toFixed(3)} -> ${coast.surge.toFixed(4)}`);
check("the river settles back to its own pace", Math.abs(coast.flow - travel.flow) < 2 && coast.flow > 0.2, `flow ${coast.flow.toFixed(3)}`);

// Ripple recycling: overfill the pool and confirm nothing is lost or duplicated.
const pool = createWorld();
for (let i = 0; i < MAX_RIPPLES * 3; i += 1) spawnRipple(pool, i, i * 2, 1);
check("the ripple pool never grows", pool.ripples.length === MAX_RIPPLES);
check("every slot is live after overfilling", pool.ripples.every((r) => r.strength > 0));
check("impacts are recorded for the sprite layers", pool.impacts.length === MAX_RIPPLES * 3);

// Ages advance and slots free themselves.
const aging = createWorld();
spawnRipple(aging, 0, 10, 1);
for (let i = 0; i < 60 * Math.ceil(RIPPLE_LIFE + 1); i += 1) updateWorld(aging, input, 1 / 60, W, H);
check("a ripple expires and frees its slot", aging.ripples.filter((r) => r.strength > 0).length < MAX_RIPPLES);

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
