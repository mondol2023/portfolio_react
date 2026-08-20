/** Small, dependency-free math helpers shared by the game modules. */

/** Wraps `value` into the range `[-half, half)` — Pac-Man style edge wrap on one axis. */
export function wrapCoordinate(value: number, half: number): number {
  const size = half * 2;
  let wrapped = (value + half) % size;
  if (wrapped < 0) wrapped += size;
  return wrapped - half;
}

/** Shortest signed distance from angle `a` to angle `b`, in radians, within (-PI, PI]. */
export function angleDelta(a: number, b: number): number {
  const twoPi = Math.PI * 2;
  let delta = (b - a) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  return delta;
}

/** Turns angle `current` towards `target` by at most `maxDelta` radians. */
export function turnTowards(current: number, target: number, maxDelta: number): number {
  const delta = angleDelta(current, target);
  const clamped = Math.max(-maxDelta, Math.min(maxDelta, delta));
  return current + clamped;
}
