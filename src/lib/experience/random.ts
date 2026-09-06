/**
 * Deterministic pseudo-randomness for generated geometry.
 *
 * Every scene in this site scatters something — dust, stars, skill planets — and
 * every one of those scatters runs inside a `useMemo` during render. `Math.random`
 * there is an impurity: React is free to re-run the memo, and when it does the
 * whole cloud jumps to a new shape. It also guarantees the server and the client
 * disagree for anything rendered on both.
 *
 * A seeded generator removes both problems for free. Same seed, same cloud,
 * every time — and the scatter still looks random, which is the only property
 * the visuals actually needed.
 */

/**
 * mulberry32 — small, fast, and good enough for placing particles.
 *
 * Returns a function, so a caller draws a sequence rather than passing an
 * incrementing seed around.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills a `Float32Array` of xyz triples with points inside a sphere.
 *
 * Sampling a radius and two angles keeps the distribution even; filling a cube
 * and rejecting the corners would leave the cloud visibly denser at its edges.
 * `flatten` squashes the Y axis, which turns a ball the camera sits inside into
 * a haze that lies over a scene.
 */
export function sphericalCloud(
  count: number,
  { seed = 1, inner = 0, outer = 1, flatten = 1 }: CloudOptions = {},
): Float32Array {
  const random = seededRandom(seed);
  const array = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const radius = inner + random() * (outer - inner);
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    array[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    array[index * 3 + 1] = radius * Math.cos(phi) * flatten;
    array[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  return array;
}

interface CloudOptions {
  /** Same seed, same cloud. Vary it to give two clouds different shapes. */
  seed?: number;
  /** Hollow centre, so nothing spawns on top of the camera. */
  inner?: number;
  outer?: number;
  /** Y multiplier. Below 1 flattens the sphere into a disc. */
  flatten?: number;
}
