import { approach, between, clamp01 } from "../engine/math";
import type { Scene } from "../engine/scene";
import { rgba, shade } from "../engine/tone-color";

/**
 * Rails converging on a vanishing point, with markers travelling toward the reader.
 *
 * This is the one borrowed feeling in the set: unfor-dev's work section arrives
 * by moving the camera *to* the content rather than fading it in. There is no
 * 3D here and no new dependency — a single divide is the entire projection — but
 * the beat is the same. Markers stream in fast on arrival and decelerate to a
 * slow idle, so entering the section feels like pulling up somewhere.
 *
 * **Its interaction is the camera.** The vanishing point drifts toward the
 * pointer, which turns the whole projection with it — every rail and every
 * marker re-lands, because they are all derived from that one point. Scrolling
 * puts a foot on the accelerator. Nothing else in the set responds to the reader
 * by moving the *frame* rather than its contents.
 */
export interface PerspectiveRailsOptions {
  /** Vanishing point, as viewport fractions. */
  vanishX?: number;
  vanishY?: number;
  rails?: number;
  markers?: number;
  /** Depth units per second once settled. */
  idleSpeed?: number;
  /** Depth units per second at the moment of arrival. */
  arrivalSpeed?: number;
  alpha?: number;
  /** How far the vanishing point follows the pointer, as a viewport fraction.
   *  Small on purpose: this multiplies out along every rail. */
  look?: number;
  /** Extra marker speed at a brisk scroll, as a multiple of the idle speed. */
  scrollBoost?: number;
}

interface Marker {
  /** Depth. 0 is at the reader, `FAR` is at the vanishing point. */
  z: number;
  rail: number;
  size: number;
}

const FAR = 12;
/** Controls how hard the projection compresses with depth. */
const FOCAL = 2.6;
/** Scroll speed in px/s that counts as a full boost. */
const SCROLL_REFERENCE = 2200;

export function perspectiveRails(options: PerspectiveRailsOptions = {}): Scene {
  const {
    vanishX = 0.5,
    vanishY = 0.44,
    rails = 9,
    markers = 26,
    idleSpeed = 0.55,
    arrivalSpeed = 5.5,
    alpha = 1,
    look = 0.05,
    scrollBoost = 3,
  } = options;

  const lanes: Marker[] = Array.from({ length: markers }, (_, i) => ({
    z: (i / markers) * FAR + between(0, FAR / markers),
    rail: Math.floor(between(0, rails)),
    size: between(1.4, 3.2),
  }));

  let width = 0;
  let height = 0;

  /** The camera's own aim, eased behind the pointer. The input is already
   *  smoothed; this second, much slower stage is what makes it feel like a
   *  heavy camera head rather than a mouse-look. */
  let aimX = 0;
  let aimY = 0;
  let boost = 0;

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
    },

    frame({ ctx, dt, intro, palette, pointer, scroll }) {
      aimX = approach(aimX, pointer.nx, 0.55, dt);
      aimY = approach(aimY, pointer.ny, 0.55, dt);

      const boostTarget = clamp01(Math.abs(scroll.velocity) / SCROLL_REFERENCE);
      boost = approach(boost, boostTarget, boostTarget > boost ? 0.15 : 0.8, dt);

      const vx = width * (vanishX + aimX * look);
      const vy = height * (vanishY + aimY * look * 0.6);

      /** Where depth `z` on a rail lands on screen, plus its scale there. */
      const project = (z: number, railX: number) => {
        const k = FOCAL / (FOCAL + z);
        return { x: vx + (railX - vx) * k, y: vy + (height * 1.08 - vy) * k, k };
      };

      const railX = (rail: number) => {
        // Rails fan out well past both edges, so the outermost ones leave the
        // frame instead of stopping in mid-air.
        const spread = (rail / Math.max(1, rails - 1)) * 2 - 1;
        return width * 0.5 + spread * width * 1.35;
      };

      const faint = shade(palette.soft, palette.dark ? 0.15 : -0.1);

      for (let rail = 0; rail < rails; rail += 1) {
        const near = project(0, railX(rail));
        const gradient = ctx.createLinearGradient(vx, vy, near.x, near.y);
        gradient.addColorStop(0, rgba(faint, 0));
        gradient.addColorStop(1, rgba(palette.tone, clamp01(0.16 * intro * alpha)));

        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(near.x, near.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Fast on arrival, easing down to idle. `intro` is already eased, so this
      // decelerates smoothly without a second curve. The scroll boost rides on
      // top: the reader can push the arrival along at any point, not only in the
      // first second and a bit.
      const speed =
        (idleSpeed + (arrivalSpeed - idleSpeed) * (1 - intro)) * (1 + boost * scrollBoost);
      const bright = shade(palette.tone, palette.dark ? 0.3 : -0.2);

      for (const marker of lanes) {
        marker.z -= speed * dt;
        if (marker.z <= 0) {
          marker.z += FAR;
          marker.rail = Math.floor(between(0, rails));
        }

        const { x, y, k } = project(marker.z, railX(marker.rail));
        const r = marker.size * k * 3.2;
        if (r <= 0.2) continue;

        // Fades out as it passes the reader and again as it approaches the
        // vanishing point, so nothing pops into or out of existence.
        const depthFade = clamp01(marker.z / (FAR * 0.7));
        const nearFade = clamp01(marker.z / 1.2);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(bright, clamp01(0.5 * (1 - depthFade) * nearFade * intro * alpha));
        ctx.fill();
      }
    },
  };
}
