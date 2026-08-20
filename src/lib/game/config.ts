/**
 * Tunable constants for the 3D snake game.
 *
 * Kept in one file so gameplay feel (speed, turn rate, arena size) can be
 * balanced without hunting through every module that consumes it.
 */

export const GAME_CONFIG = {
  /** Side length of the square play area, in world units. Wrapping happens here. */
  arenaSize: 40,
  /** Extra frustum room around the arena so nothing clips the viewport edge. */
  arenaPadding: 1.08,

  /** World units the snake head travels per second. */
  snakeSpeed: 9,
  /** Max radians per second the heading may turn towards the click target. */
  snakeTurnRate: Math.PI * 2.2,
  /** Radius of each body sphere. */
  segmentRadius: 0.55,
  /** Arc-length distance between consecutive body segments. */
  segmentSpacing: 0.85,
  /** Segments added to the tail per food eaten. */
  growthPerFood: 1,
  /** Starting body length, head included. */
  initialLength: 4,
  /**
   * Segments nearest the head that are exempt from self-collision, so a turn
   * immediately after the head can't collide with the neck that is still
   * catching up to it.
   */
  selfCollisionSkip: 4,

  /** Food sphere radius. */
  foodRadius: 0.6,
  /** Minimum clearance kept between a food spawn point and every body segment. */
  foodSpawnClearance: 1.6,
  /** Spawn attempts before giving up finding a clear cell (arena is never this full). */
  foodSpawnAttempts: 40,
} as const;

/** Colour palette, kept separate from gameplay numbers for easy re-skinning. */
export const GAME_COLORS = {
  background: 0x0b0f14,
  floor: 0x111820,
  grid: 0x1c2a35,
  boundary: 0x2dd4bf,
  snakeHead: 0x22d3ee,
  snakeBody: 0x0ea5b7,
  food: 0xf97316,
  ambientLight: 0xffffff,
  directionalLight: 0xffffff,
} as const;
