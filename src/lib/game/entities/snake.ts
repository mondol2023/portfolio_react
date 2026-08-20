import * as THREE from "three";

import { GAME_COLORS, GAME_CONFIG } from "../config";
import { turnTowards, wrapCoordinate } from "../utils/math";

/**
 * Distance, in world units, between consecutive samples of the head's path.
 * Body segments read their position off this trail rather than following one
 * another directly, which is what makes the follow motion smooth instead of
 * grid-snapped. Small enough that segments read as continuous at max turn rate.
 */
const TRAIL_SAMPLE_SPACING = 0.06;

/**
 * The snake: one head mesh, a growing tail of body meshes, and the path
 * history that lets the tail follow the head's actual curve instead of a
 * straight line towards it.
 *
 * Continuous-movement design (no grid): the head always moves forward at a
 * fixed speed and only its heading changes, turning towards whatever angle
 * `steerTowards` was last given. Every segment behind it reads its position
 * off a recorded trail of past head positions, offset by how far back (in
 * travelled distance, not frame count) that segment sits — the same
 * technique classic arcade "smooth" snakes use, and it makes screen wrap
 * trivial: the trail simply records the jump, and followers play it back
 * verbatim when their turn comes.
 */
export class Snake {
  private readonly group = new THREE.Group();
  private readonly geometry = new THREE.SphereGeometry(GAME_CONFIG.segmentRadius, 16, 16);
  private readonly headMaterial = new THREE.MeshStandardMaterial({ color: GAME_COLORS.snakeHead });
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({ color: GAME_COLORS.snakeBody });

  private readonly head: THREE.Mesh;
  private readonly segments: THREE.Mesh[] = [];

  /** Recorded head positions, oldest first, spaced `TRAIL_SAMPLE_SPACING` apart. */
  private readonly trail: THREE.Vector3[] = [];
  private trailCarry = 0;

  private heading = 0;
  private targetHeading = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.head = new THREE.Mesh(this.geometry, this.headMaterial);
    this.head.position.y = GAME_CONFIG.segmentRadius;
    this.group.add(this.head);
    this.scene.add(this.group);

    for (let i = 1; i < GAME_CONFIG.initialLength; i++) this.addSegment();
  }

  /** Sets the heading the head will keep turning towards, in XZ-plane radians. */
  steerTowards(angleRadians: number): void {
    this.targetHeading = angleRadians;
  }

  /** Advances the head, records its trail, and re-lays every body segment along it. */
  update(deltaSeconds: number): void {
    this.heading = turnTowards(this.heading, this.targetHeading, GAME_CONFIG.snakeTurnRate * deltaSeconds);

    const half = GAME_CONFIG.arenaSize / 2;
    const step = GAME_CONFIG.snakeSpeed * deltaSeconds;
    const x = wrapCoordinate(this.head.position.x + Math.cos(this.heading) * step, half);
    const z = wrapCoordinate(this.head.position.z + Math.sin(this.heading) * step, half);
    this.head.position.set(x, GAME_CONFIG.segmentRadius, z);

    this.recordTrail(step);
    this.layBodyAlongTrail();
  }

  /** Appends one segment to the tail, positioned at the current tail end so it doesn't pop in. */
  grow(count = 1): void {
    for (let i = 0; i < count; i++) this.addSegment();
  }

  getHeadPosition(): THREE.Vector3 {
    return this.head.position;
  }

  /** Body positions eligible for self-collision, nearest-to-head segments excluded. */
  getCollidableBodyPositions(): THREE.Vector3[] {
    return this.segments.slice(GAME_CONFIG.selfCollisionSkip).map((segment) => segment.position);
  }

  /** Every occupied position, head included — used to keep food off the snake. */
  getAllPositions(): THREE.Vector3[] {
    return [this.head.position, ...this.segments.map((segment) => segment.position)];
  }

  private addSegment(): void {
    const tailPosition = this.segments.at(-1)?.position ?? this.head.position;
    const segment = new THREE.Mesh(this.geometry, this.bodyMaterial);
    segment.position.copy(tailPosition);
    this.segments.push(segment);
    this.group.add(segment);
  }

  /** Pushes a new trail sample every `TRAIL_SAMPLE_SPACING` of travel, framerate-independent. */
  private recordTrail(stepDistance: number): void {
    this.trailCarry += stepDistance;
    while (this.trailCarry >= TRAIL_SAMPLE_SPACING) {
      this.trail.push(this.head.position.clone());
      this.trailCarry -= TRAIL_SAMPLE_SPACING;
    }

    // Bounded memory: never keep more history than the current tail could read from.
    const needed = Math.ceil((this.segments.length * GAME_CONFIG.segmentSpacing) / TRAIL_SAMPLE_SPACING) + 4;
    if (this.trail.length > needed) this.trail.splice(0, this.trail.length - needed);
  }

  private layBodyAlongTrail(): void {
    const samplesPerSegment = GAME_CONFIG.segmentSpacing / TRAIL_SAMPLE_SPACING;

    this.segments.forEach((segment, i) => {
      const behind = Math.round((i + 1) * samplesPerSegment);
      const index = this.trail.length - 1 - behind;
      const sample = this.trail[Math.max(0, index)];
      if (sample) segment.position.copy(sample);
    });
  }

  /** Removes every mesh from the scene and frees the shared geometry/materials. */
  dispose(): void {
    this.scene.remove(this.group);
    this.geometry.dispose();
    this.headMaterial.dispose();
    this.bodyMaterial.dispose();
  }
}
