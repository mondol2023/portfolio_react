import { unprojectToWater, type Camera } from "./camera";
import { sampleDayCycle, type SkyState } from "./day-cycle";
import { sampleLighting, type Lighting } from "./lighting";
import type { Input } from "./input";
import { clamp, damp, fract01, hash1, lerp } from "./num";
import { MAX_RIPPLES, RIPPLE_LIFE, waveHeight, type Ripple } from "./water";

/**
 * The one mutable thing in the scene.
 *
 * Every renderer — the shader, the sprite painter, each individual layer —
 * reads this and writes nothing to it. That is the whole architecture: one
 * place decides what is true this frame, and drawing is a pure function of it.
 * It is also what lets the water and the boats agree, since they are reading
 * the same wind, the same clock, and the same list of ripples rather than each
 * keeping a private copy that drifts.
 */

/** How long an undisturbed river takes to go all the way round its day. */
const DAY_SECONDS = 720;

/** Where the page's top sits in that day. A little before sunrise. */
const DAWN_PHASE = 0.94;

/** How much of a day a full page of scrolling is worth. */
const SCROLL_SPAN = 0.62;

/** Camera height above the water, in world units — standing on a moored boat. */
const EYE_HEIGHT = 2.05;

/** Downstream speed with nobody touching the page, world units per second. */
const BASE_FLOW = 1.05;

/**
 * How far the channel wanders either side of centre, in world units.
 *
 * The banks stand at x = +/-44, so this swings the camera between roughly 33
 * and 55 units from each of them. Close enough that the near bank grows and
 * the far one recedes as the bend comes round; never close enough to run
 * aground, which would need collision logic the scene is better off without.
 */
const MEANDER = 7;

export interface Impact {
  x: number;
  z: number;
  /** 0..1. A deliberate tap is 1; a fish or a drag-wake is much less. */
  strength: number;
}

export interface World {
  /** Seconds since the scene started. The shader's clock too. */
  time: number;
  /** Seconds since the previous frame, already clamped for tab-switch gaps. */
  dt: number;
  /** CSS pixels. */
  width: number;
  height: number;
  cam: Camera;
  sky: SkyState;
  /**
   * The one light, derived from `sky` and the camera.
   *
   * Kept on the world rather than recomputed per layer so that the boat's rim
   * highlight, the reed's shadow and the water's specular are all answers to
   * the same question asked once.
   */
  light: Lighting;
  /** 0..1 position in the day. `sky` is this, sampled. */
  phase: number;
  /** Multiplier on the whole wave spectrum. ~0.8 calm, ~2 in a gust. */
  wind: number;
  /** How fast the river is carrying the camera downstream, world units/sec. */
  flow: number;
  /**
   * Signed scroll push, roughly -1..1.
   *
   * Positive is the reader driving downstream, negative is them hauling back
   * up the page. Kept on the world rather than derived where it is needed
   * because three separate things read it — the current, the eye's lean, and
   * the chop — and they have to be reading the same number to agree.
   */
  surge: number;

  /**
   * The scroll fraction as of last frame, and the push derived from it.
   *
   * Bookkeeping rather than scenery, but it has to live on the world because
   * it is per-scene state and because the alternative — writing the decay back
   * into the input's own reading — makes a consumer mutate its producer.
   */
  scrollSeen: number;
  scrollPush: number;
  /** Smoothed page scroll, 0..1. */
  scroll: number;
  ripples: Ripple[];
  pointer: {
    /** CSS pixels. */
    x: number;
    y: number;
    active: boolean;
    /** Where the pointer is looking on the water, when it is looking at water. */
    worldX: number;
    worldZ: number;
    onWater: boolean;
  };
  /**
   * Everything that hit the water this frame, cleared at the top of the next.
   *
   * The ripple pool records that a disturbance exists; this records that one
   * *began*, which is what the splash particles need — they cannot tell a
   * one-frame-old ripple from a four-second-old one by looking at the pool.
   */
  impacts: Impact[];
  /** When the next fish breaks the surface, in scene seconds. */
  nextRise: number;
  /** Advanced with each rise so `hash1` gives a different, repeatable answer. */
  riseSeed: number;
}

export function createWorld(): World {
  const cam: Camera = { x: 0, y: EYE_HEIGHT, z: 0, yaw: 0, pitch: -0.015, fov: 0.62 };
  const dawn = sampleDayCycle(DAWN_PHASE);

  return {
    time: 0,
    dt: 0,
    width: 1,
    height: 1,
    cam,
    sky: dawn,
    light: sampleLighting(dawn, cam),
    phase: DAWN_PHASE,
    wind: 1,
    flow: BASE_FLOW,
    surge: 0,
    scrollSeen: 0,
    scrollPush: 0,
    scroll: 0,
    // Pre-allocated and reused: a ripple with zero strength is a free slot, so
    // there is no allocation, no garbage, and no array resizing in the loop.
    ripples: Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, z: 0, age: 0, strength: 0 })),
    pointer: { x: 0, y: 0, active: false, worldX: 0, worldZ: 12, onWater: false },
    impacts: [],
    nextRise: 4,
    riseSeed: 1,
  };
}

/**
 * Puts a ripple into the pool, recycling the most spent slot when it is full.
 *
 * "Most spent" rather than "oldest": a fading tap should lose its slot to a
 * fresh one before a young ripple does, which is what keeps a rapid scribble
 * from erasing the splash the reader just made deliberately.
 */
export function spawnRipple(world: World, x: number, z: number, strength: number): void {
  world.impacts.push({ x, z, strength });

  let slot = world.ripples[0] as Ripple;
  let worst = -1;

  for (const ripple of world.ripples) {
    const spent = ripple.strength <= 0 ? Infinity : ripple.age / RIPPLE_LIFE;
    if (spent > worst) {
      worst = spent;
      slot = ripple;
    }
  }

  slot.x = x;
  slot.z = z;
  slot.age = 0;
  slot.strength = strength;
}

/** Seconds until the next fish rises. Long enough that it reads as an event. */
function nextRiseDelay(seed: number): number {
  return 5 + hash1(seed) * 9;
}

export function updateWorld(
  world: World,
  input: Input,
  dt: number,
  width: number,
  height: number,
): void {
  // Last frame's impacts have been drawn; the queue is only ever one frame deep.
  world.impacts.length = 0;

  world.dt = dt;
  world.time += dt;
  world.width = width;
  world.height = height;

  /*
   * The day is scroll *plus* a slow hand of its own. Scroll alone would make
   * the sky a read-out of the scrollbar — park halfway down and it is always
   * the same afternoon. The drift means a page left open quietly becomes
   * evening, which is the difference between a control and a place.
   */
  world.scroll = damp(world.scroll, input.state.scroll, 0.0001, dt);
  world.phase = fract01(DAWN_PHASE + world.scroll * SCROLL_SPAN + world.time / DAY_SECONDS);
  world.sky = sampleDayCycle(world.phase);

  /*
   * Which way the reader is pushing, and how hard.
   *
   * Signed, deliberately. Taking the magnitude of the scroll velocity throws
   * away the one thing the reader is actually telling us, and a scene that
   * gives the same answer whichever way you make the gesture is not responding
   * to you — it is reacting to noise. Signed, scrolling down is leaning into
   * the current and scrolling back is backing water against it.
   *
   * Fast to build and slow to release, so a flick lands at once and the river
   * then coasts. That coast is most of the difference between travelling
   * somewhere and being animated at.
   */
  /*
   * The reading has to be aged before it is used, which is the one thing the
   * browser will not do for us. There is no "scrolling has stopped" event: the
   * last event of a flick reports a large speed and then nothing further ever
   * arrives, so a reading taken at face value stands forever and the river
   * surges for as long as the page is open. A reading the reader has not
   * refreshed is therefore decayed instead of believed.
   */
  const fresh = input.state.scroll !== world.scrollSeen;
  world.scrollSeen = input.state.scroll;
  world.scrollPush = fresh
    ? input.state.scrollVelocity
    : world.scrollPush * Math.pow(0.001, dt);

  const drive = clamp(world.scrollPush * 2.4, -1.3, 1.3);
  const settling = Math.abs(drive) > Math.abs(world.surge) ? 0.002 : 0.45;
  world.surge = damp(world.surge, drive, settling, dt);

  // Wind answers effort and not direction: hauling the page back kicks up as
  // much chop as driving it forward does.
  const effort = Math.min(1.15, Math.abs(world.surge));
  const breathing = 0.92 + 0.26 * Math.sin(world.time * 0.11) + 0.12 * Math.sin(world.time * 0.37);
  world.wind = damp(world.wind, breathing + effort, 0.06, dt);

  // Floored well above zero, because a river does not run backwards. Scrolling
  // up slows it to a drift instead — the boat losing way, which reads as a
  // thing with mass, where reversing would read as the world being rewound.
  world.flow = damp(world.flow, Math.max(0.22, BASE_FLOW + world.surge * 1.9), 0.1, dt);

  // The camera is carried downstream forever. Nothing is anchored to absolute
  // Z, so the coordinate growing without bound costs nothing until float
  // precision would bite — hours of continuous viewing away.
  world.cam.z += world.flow * dt;

  /*
   * The channel meanders.
   *
   * Keyed on distance travelled rather than on the clock, because a bend
   * belongs to the river and not to the hour: slow the current and you take
   * longer to round the same bend, which is the tell that the two are
   * genuinely different quantities. Two incommensurable wavelengths, so the
   * bends never fall into a period the reader can learn.
   *
   * Without this the camera runs down a dead-straight line forever, and the
   * banks sit at a fixed distance on either side for as long as anyone cares
   * to watch — the single clearest sign that a river scene is on rails.
   */
  const drift =
    Math.sin(world.cam.z * 0.0075) * MEANDER +
    Math.sin(world.cam.z * 0.0031 + 2.1) * MEANDER * 0.55;

  world.cam.x = damp(world.cam.x, drift, 0.5, dt);

  // The bow follows the bend: this is the derivative of `drift`, which is the
  // heading the channel is actually going. Multiplied up by half again, since
  // a boat swinging round a bend over-steers slightly and then settles, and
  // the geometrically exact version is too small to read at this scale.
  const bearing =
    (Math.cos(world.cam.z * 0.0075) * MEANDER * 0.0075 +
      Math.cos(world.cam.z * 0.0031 + 2.1) * MEANDER * 0.55 * 0.0031) *
    1.5;

  /*
   * Parallax. The pointer moves the camera by a couple of degrees, damped hard
   * so it lags the cursor — an instant response reads as the page being
   * dragged, a late one reads as a heavy thing being turned.
   */
  const nx = world.pointer.active ? (world.pointer.x / Math.max(1, width)) * 2 - 1 : 0;
  const ny = world.pointer.active ? (world.pointer.y / Math.max(1, height)) * 2 - 1 : 0;

  world.cam.yaw = damp(world.cam.yaw, nx * 0.1 + bearing, 0.02, dt);

  // The surge term is the vestibular cue: accelerating downstream dips the eye
  // a little, easing off lifts it. Tiny — a degree at most — and the reason
  // scrolling feels like being carried rather than like a number changing.
  world.cam.pitch = damp(world.cam.pitch, -0.015 - ny * 0.055 - world.surge * 0.022, 0.02, dt);

  // Standing on something that floats: the eye rides the swell it is watching,
  // and settles lower in the water the harder it is being driven.
  const bob = waveHeight(world.cam.x, world.cam.z, world.time, world.wind);
  world.cam.y = lerp(
    world.cam.y,
    EYE_HEIGHT + bob * 0.42 - Math.max(0, world.surge) * 0.055,
    1 - Math.pow(0.02, dt),
  );

  world.pointer.x = input.state.pointerX;
  world.pointer.y = input.state.pointerY;
  world.pointer.active = input.state.hasPointer;

  const aim = world.pointer.active
    ? unprojectToWater(world.cam, world.pointer.x, world.pointer.y, width, height)
    : null;

  world.pointer.onWater = aim !== null;
  if (aim) {
    world.pointer.worldX = aim.x;
    world.pointer.worldZ = aim.z;
  }

  // Taps become ripples only where they actually hit water — a click up in the
  // sky should do nothing, and pretending otherwise is how an interaction
  // stops feeling like it belongs to the scene.
  for (const touch of input.drainTouches()) {
    const hit = unprojectToWater(world.cam, touch.x, touch.y, width, height);
    if (!hit) continue;
    // Far-away taps are clamped in: a ripple 400 units out is two pixels wide
    // and reads as nothing happening.
    if (hit.z - world.cam.z > 90) continue;
    spawnRipple(world, hit.x, hit.z, touch.strength);
  }

  // A fish rises now and then, whether or not anyone is watching.
  if (world.time >= world.nextRise) {
    world.riseSeed += 1;
    world.nextRise = world.time + nextRiseDelay(world.riseSeed);
    const seed = world.riseSeed;
    const spread = 26;
    spawnRipple(
      world,
      world.cam.x + (hash1(seed * 3.1) - 0.5) * spread * 2,
      world.cam.z + 8 + hash1(seed * 7.7) * spread,
      0.45 + hash1(seed * 11.3) * 0.35,
    );
  }

  for (const ripple of world.ripples) {
    if (ripple.strength <= 0) continue;
    ripple.age += dt;
    if (ripple.age >= RIPPLE_LIFE) ripple.strength = 0;
  }

  // Last, because it depends on both the sky and where the camera ended up
  // looking: which side a hull is rim-lit on changes as the reader turns the
  // view, and it has to be this frame's yaw, not last frame's.
  world.light = sampleLighting(world.sky, world.cam);
}
