import gsap from "gsap";

import { CAMERA } from "../config/game-config";
import { useCameraStore } from "../stores/camera-store";
import { damp } from "../utils/math";
import { prefersReducedMotion } from "../hooks/use-motion-preference";
import { gameBus } from "../events/game-bus";

import type { GameSystem, SystemContext } from "./types";
import type { Unsubscribe } from "../utils/event-bus";

/** Shake impulse added to the accumulated amount for each reactive event. */
const SHAKE_IMPULSE: Record<"merge" | "split" | "collect", number> = {
  merge: CAMERA.shakeMerge,
  split: CAMERA.shakeSplit,
  collect: CAMERA.shakeCollect,
};

/**
 * Camera intent: a GSAP-powered intro dolly, scroll-linked drift, and small
 * reactive shake.
 *
 * On the world's first frame the rig dollies in from further out — the
 * cinematic "the world arrives" beat, and the module's designated GSAP
 * responsibility (timelines for camera transitions; Motion owns the HTML
 * overlay; R3F owns everything in the render loop). After the intro, the rig
 * drifts vertically with page scroll so the field stays around whichever
 * section is being read.
 *
 * Merges, splits and collects each add a small impulse to an accumulated
 * shake amount (same subscribe-to-`gameBus` pattern as `ScoreSystem`), which
 * decays exponentially and offsets the camera with a cheap sinusoidal
 * wobble — no per-frame allocation, no random walk to desync across
 * remounts.
 *
 * Reduced motion skips the intro, the drift, and the shake: the camera holds
 * its resting pose.
 */
export class CameraSystem implements GameSystem {
  readonly id = "camera";

  private introduced = false;
  private readonly pose = { z: CAMERA.position[2] + 4.5 };
  private shakeAmount = 0;
  // Tracked separately from `camera.position.y` so the shake offset written
  // each frame never gets fed back into the drift's own damping as if it
  // were part of the "real" position it needs to ease toward.
  private dampedY = CAMERA.position[1];
  private readonly unsubscribe: Unsubscribe;

  constructor() {
    this.unsubscribe = gameBus.on((event) => {
      if (event.type === "merge" || event.type === "split" || event.type === "collect") {
        this.shakeAmount += SHAKE_IMPULSE[event.type];
      }
    });
  }

  update({ camera, delta, elapsed }: SystemContext): void {
    // Read the scroll position fresh each frame — no stale-store lag — and
    // publish it for other systems (none yet, but the store is the contract).
    const progress =
      window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    useCameraStore.getState().setScrollProgress(progress);

    if (prefersReducedMotion()) {
      this.shakeAmount = 0;
      camera.position.x = CAMERA.position[0];
      return;
    }

    if (!this.introduced) {
      this.introduced = true;
      gsap.to(this.pose, {
        z: CAMERA.position[2],
        duration: 1.6,
        ease: "power2.out",
        overwrite: true,
      });
    }

    this.shakeAmount *= Math.exp(-CAMERA.shakeDecay * delta);
    if (this.shakeAmount < 0.0005) this.shakeAmount = 0;

    // Two off-phase sinusoids read as an irregular tremble rather than a
    // metronomic wobble, at effectively no cost (no allocation, no per-frame
    // randomness to keep seeded).
    const shakeX = this.shakeAmount * Math.sin(elapsed * 37);
    const shakeY = this.shakeAmount * Math.sin(elapsed * 53 + 1.3);

    camera.position.z = this.pose.z;
    const targetY = CAMERA.position[1] - progress * CAMERA.scrollDriftY;
    this.dampedY = damp(this.dampedY, targetY, CAMERA.driftLambda, delta);
    camera.position.y = this.dampedY + shakeY;
    camera.position.x = CAMERA.position[0] + shakeX;
  }

  dispose(): void {
    gsap.killTweensOf(this.pose);
    this.unsubscribe();
  }
}
