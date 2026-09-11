import { approach, clamp01, easeInOutSine } from "../engine/math";
import { createNoise1 } from "../engine/noise";
import type { Scene } from "../engine/scene";
import { rgba } from "../engine/tone-color";

/**
 * One soft light source.
 *
 * Never a scene on its own — it is the thing the other primitives are lit by, so
 * a section reads as a place rather than a pattern on a flat field. Cheap enough
 * to rebuild its gradient every frame because there is only ever one or two.
 *
 * It follows the reader at a distance and brightens when they are present. The
 * `follow` is deliberately a fraction of what the foreground primitives do: a
 * light source that kept pace with the cursor would flatten the depth the rest
 * of the scene is trying to build, and this is the layer furthest back.
 */
export interface GlowDiscOptions {
  /** Resting position as viewport fractions. */
  x?: number;
  y?: number;
  /** Radius as a fraction of the viewport's smaller side. */
  radius?: number;
  alpha?: number;
  /** How much the radius swells and settles, as a fraction of itself. */
  breathe?: number;
  /** Seconds for one full breath. */
  period?: number;
  /** How far below its resting spot it starts, as a fraction of height. A
   *  positive value gives the "rises into place" arrival. */
  rise?: number;
  /** How far it drifts toward the reader, as a viewport fraction. */
  follow?: number;
}

export function glowDisc(options: GlowDiscOptions = {}): Scene {
  const {
    x = 0.5,
    y = 0.4,
    radius = 0.42,
    alpha = 0.5,
    breathe = 0.06,
    period = 9,
    rise = 0,
    follow = 0.045,
  } = options;

  let width = 0;
  let height = 0;

  /** Its own slow stream, so the breath is not a metronome. One octave: this is
   *  a light source, not a candle. */
  const unsteady = createNoise1();
  let driftX = 0;
  let driftY = 0;

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
    },

    frame({ ctx, dt, t, intro, palette, pointer }) {
      // A second, very slow easing stage on top of the input's own. At 1.1s the
      // light lags visibly behind the foreground, which is what sells it as
      // being further away.
      driftX = approach(driftX, pointer.nx, 1.1, dt);
      driftY = approach(driftY, pointer.ny, 1.1, dt);

      const swell =
        1 + (Math.sin((t / period) * Math.PI * 2) * 0.75 + unsteady(t / period) * 0.25) * breathe;
      const r = Math.min(width, height) * radius * swell;
      if (r <= 0) return;

      const cx = width * (x + driftX * follow);
      const cy = height * (y + driftY * follow * 0.7) + (1 - easeInOutSine(intro)) * height * rise;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      // A little warmer when someone is actually there. Small enough that it is
      // never noticed as a change, only as the room being occupied.
      const attention = 1 + pointer.presence * 0.08;
      const peak = clamp01(alpha * intro * attention * (palette.dark ? 1 : 0.82));

      gradient.addColorStop(0, rgba(palette.tone, peak * 0.32));
      gradient.addColorStop(0.45, rgba(palette.soft, peak * palette.softAlpha * 1.6));
      gradient.addColorStop(1, rgba(palette.soft, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}
