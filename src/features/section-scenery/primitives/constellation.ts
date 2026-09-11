import { approach, between, clamp01, falloff } from "../engine/math";
import type { Scene } from "../engine/scene";
import { rgba, shade } from "../engine/tone-color";

/**
 * Scattered nodes, joined when they drift close, with a signal sweeping across.
 *
 * The silhouette is a graph — points and links, no continuous edge anywhere. The
 * sweep is what makes it a *stack* rather than generic particle-plexus wallpaper:
 * something travels through the network and the nodes it passes light up, which
 * is the one gesture that reads as "these pieces talk to each other".
 *
 * **Its interaction is connection.** The pointer joins the graph as a node: the
 * ones within reach link to it and drift toward it, and scrolling pushes the
 * sweep along faster, so moving through the section is what sends the signal.
 */
export interface ConstellationOptions {
  count?: number;
  /** Link distance in CSS px at a 1280px-wide viewport; scaled with the canvas. */
  linkDistance?: number;
  /** Node travel in px per second. */
  speed?: number;
  /** Seconds for the sweep to cross. Zero switches the sweep off. */
  sweepPeriod?: number;
  alpha?: number;
  /** Furthest a node leans toward the pointer, in CSS px. Zero switches the
   *  attraction off and leaves only the links. */
  lean?: number;
  /** Extra sweep speed at a brisk scroll, as a multiple of the resting speed. */
  scrollBoost?: number;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  /** Lean toward the pointer, as an offset from the drift position rather than a
   *  force on it. A force would be added energy the drift never sheds: nodes
   *  would leave the pointer faster than they arrived and the whole graph would
   *  slowly heat up over a long visit. An offset springs back to nothing. */
  ox: number;
  oy: number;
  /** Where it was actually drawn this frame — drift plus lean. Links and the
   *  sweep both need it, and recomputing it three times invites the three copies
   *  to disagree. */
  px: number;
  py: number;
}

const REFERENCE_WIDTH = 1280;
/** Scroll speed in px/s that counts as a full boost. Roughly a fast flick on a
 *  trackpad; a leisurely read barely registers, which is the intent. */
const SCROLL_REFERENCE = 2200;

export function constellation(options: ConstellationOptions = {}): Scene {
  const {
    count = 30,
    linkDistance = 165,
    speed = 12,
    sweepPeriod = 7,
    alpha = 1,
    lean = 30,
    scrollBoost = 2.5,
  } = options;

  let nodes: Node[] = [];
  let width = 0;
  let height = 0;
  let link = linkDistance;

  /** The sweep's own clock. It runs ahead of `t` when the reader scrolls, so it
   *  cannot be derived from the frame time. */
  let sweepClock = 0;
  let boost = 0;

  return {
    resize(nextWidth, nextHeight) {
      const first = width === 0;
      const previousWidth = width || nextWidth;
      const previousHeight = height || nextHeight;
      width = nextWidth;
      height = nextHeight;
      link = linkDistance * clamp01(width / REFERENCE_WIDTH) + linkDistance * 0.35;

      if (first) {
        nodes = Array.from({ length: count }, () => ({
          x: between(0, width),
          y: between(0, height),
          vx: between(-speed, speed),
          vy: between(-speed, speed),
          r: between(1.1, 2.6),
          phase: between(0, Math.PI * 2),
          ox: 0,
          oy: 0,
          px: 0,
          py: 0,
        }));
        return;
      }

      // Keep the graph the reader is looking at; just carry it into the new box.
      const sx = width / previousWidth;
      const sy = height / previousHeight;
      for (const node of nodes) {
        node.x *= sx;
        node.y *= sy;
      }
    },

    frame({ ctx, dt, t, intro, palette, pointer, scroll }) {
      const target = clamp01(Math.abs(scroll.velocity) / SCROLL_REFERENCE);
      boost = approach(boost, target, target > boost ? 0.2 : 0.9, dt);
      sweepClock += dt * (1 + boost * scrollBoost);

      const pull = lean * pointer.presence;

      for (const node of nodes) {
        node.x += node.vx * dt;
        node.y += node.vy * dt;
        // Bounce rather than wrap: a node teleporting across the canvas would
        // snap every link it was holding.
        if (node.x < 0 || node.x > width) {
          node.vx = -node.vx;
          node.x = clamp01(node.x / Math.max(1, width)) * width;
        }
        if (node.y < 0 || node.y > height) {
          node.vy = -node.vy;
          node.y = clamp01(node.y / Math.max(1, height)) * height;
        }

        let targetX = 0;
        let targetY = 0;
        if (pull > 0) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const distance = Math.hypot(dx, dy);
          const reach = falloff(distance, link * 2);
          if (reach > 0) {
            // Normalised, so a node sitting on the pointer is not thrown by a
            // divide that has almost nothing underneath it.
            const length = Math.max(1, distance);
            targetX = (dx / length) * pull * reach;
            targetY = (dy / length) * pull * reach;
          }
        }

        // Slower to release than to lean, so the graph follows the pointer and
        // relaxes behind it rather than tracking it exactly in both directions.
        const leaning = Math.hypot(targetX, targetY) > Math.hypot(node.ox, node.oy);
        const tau = leaning ? 0.3 : 0.7;
        node.ox = approach(node.ox, targetX, tau, dt);
        node.oy = approach(node.oy, targetY, tau, dt);

        node.px = node.x + node.ox;
        node.py = node.y + node.oy;
      }

      const sweepX =
        sweepPeriod > 0
          ? (((sweepClock / sweepPeriod) % 1) * 1.4 - 0.2) * width
          : Number.NEGATIVE_INFINITY;
      const sweepWidth = width * 0.14;
      const lit = (x: number) =>
        sweepPeriod > 0 ? clamp01(1 - Math.abs(x - sweepX) / sweepWidth) : 0;

      // Links first so nodes sit on top of their own connections.
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        if (!a) continue;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          if (!b) continue;
          const dx = a.px - b.px;
          const dy = a.py - b.py;
          // Rejected on the axes before the square root. With every pair tested
          // every frame, this is the difference between the cheap version of
          // this primitive and the expensive one.
          if (dx > link || dx < -link || dy > link || dy < -link) continue;
          const distance = Math.hypot(dx, dy);
          if (distance > link) continue;

          const closeness = 1 - distance / link;
          const glow = Math.max(lit(a.px), lit(b.px));
          ctx.strokeStyle = rgba(
            palette.tone,
            clamp01((0.09 * closeness + 0.22 * glow * closeness) * intro * alpha),
          );
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.stroke();
        }
      }

      const bright = shade(palette.tone, palette.dark ? 0.3 : -0.2);

      // The reader's own links, drawn brighter than the graph's. This is the
      // whole interaction: the cursor is a node, not a spotlight over one.
      if (pointer.presence > 0.01) {
        for (const node of nodes) {
          const dx = node.px - pointer.x;
          const dy = node.py - pointer.y;
          if (dx > link || dx < -link || dy > link || dy < -link) continue;
          const distance = Math.hypot(dx, dy);
          if (distance > link) continue;

          ctx.strokeStyle = rgba(
            bright,
            clamp01((1 - distance / link) * 0.34 * pointer.presence * intro * alpha),
          );
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(node.px, node.py);
          ctx.stroke();
        }
      }

      for (const node of nodes) {
        const glow = lit(node.px);
        const pulse = 0.75 + Math.sin(t * 1.6 + node.phase) * 0.25;
        const held = falloff(Math.hypot(node.px - pointer.x, node.py - pointer.y), link);
        const r = node.r * (1 + glow * 1.4 + held * pointer.presence * 0.8) * intro;
        if (r <= 0) continue;

        ctx.beginPath();
        ctx.arc(node.px, node.py, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(
          glow > 0.2 || held * pointer.presence > 0.35 ? bright : palette.tone,
          clamp01((0.3 * pulse + 0.5 * glow + 0.25 * held * pointer.presence) * intro * alpha),
        );
        ctx.fill();
      }
    },
  };
}
