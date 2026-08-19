"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The circuit road.
 *
 * A motherboard laid out down the page: a sine-wave trace running the full
 * height of the document, branch routing and components soldered along it, and
 * a glowing ball that travels the trace as the reader scrolls — the section
 * behind it energised, the section ahead still dark.
 *
 * Everything the feature needs lives in this file, styles included, so it is
 * mounted with one line and removed with one line. Nothing else in the app
 * knows it exists.
 *
 * Three things are worth knowing about how it is put together:
 *
 * 1. **The wave is anchored to the sections, not to a fixed pixel period.** Each
 *    `[data-tone-anchor]` section advances the sine by a quarter turn, so a
 *    section that begins at the far edge of the swing reaches the middle of the
 *    wave exactly at its own end, and the next one carries on from there. Long
 *    sections get long, lazy curves; short ones get tight ones. The road is
 *    therefore a drawing of the page's own rhythm rather than a pattern laid
 *    over it.
 *
 * 2. **It is absolutely positioned at the document's full height, not fixed.**
 *    So the board scrolls with the page for free — no scroll handler redraws
 *    it, and the only thing touched per frame is the ball's transform and two
 *    attributes on the mask that decides how much of the trace is lit.
 *
 * 3. **The glow is drawn with strokes, never a filter.** A `drop-shadow` over a
 *    layer this tall is a full-document rasterisation every time it changes;
 *    a wide translucent stroke under a narrow bright one reads the same and
 *    composites for nothing.
 */

/* -------------------------------------------------------------- geometry -- */

/** One section = a quarter turn: an extreme at one end, the midline at the other. */
const PHASE_PER_SECTION = Math.PI / 2;
/**
 * Trough at y = 0, which puts the head of the road in the page's top-left
 * corner rather than somewhere out in the middle of the swing.
 */
const START_PHASE = -Math.PI / 2;
/**
 * Shortest stretch of page allowed to carry a quarter turn. Anything tighter is
 * merged into its neighbour — see `readSectionEdges`.
 */
const MIN_SEGMENT = 280;
/** Vertical distance between points on the trace. Small enough that lines read as a curve. */
const SAMPLE_STEP = 14;
/** Roughly how much trace separates one via — and its branch — from the next. */
const VIA_SPACING = 116;
/** Nothing is drawn closer than this to either edge, so the board never causes a scrollbar. */
const EDGE_PADDING = 12;
/** Parallel routing beside the trace, as x offsets. Reads as a bus leaving the same header. */
const BUS_OFFSETS = [-26, -14, 14, 26];

/* ----------------------------------------------------------------- ball -- */

/** Where in the viewport the ball wants to sit — dead centre. */
const BALL_ANCHOR = 0.5;
/**
 * Fraction of the page after which the ball stops holding the centre and walks
 * down to the end of the road. The page cannot scroll past its own end, so
 * without this the last half-viewport of trace would never light.
 */
const TAIL_START = 0.86;
/**
 * How much of the remaining distance the ball covers each frame, at 60fps.
 * The entry is slow enough to read as a glide down from the corner; the chase
 * is quick enough that ordinary scrolling keeps the ball near the middle of the
 * screen rather than trailing off the bottom of it.
 */
const ENTRY_EASE = 0.026;
const CHASE_EASE = 0.11;
/** Below this the ball is where it wants to be, and the loop stops until scroll wakes it. */
const SETTLED = 0.2;

/** Cell size of the coarse grid the ambient circuitry is scattered over. */
const FIELD_CELL_X = 184;
const FIELD_CELL_Y = 196;
/** Cells this close to the road are skipped — the road already brings its own density. */
const FIELD_CLEARANCE = 104;

/** Deterministic PRNG: the same page height must always produce the same board. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Chip {
  x: number;
  y: number;
  width: number;
  height: number;
  pins: number;
}

interface Pad {
  x: number;
  y: number;
  r: number;
}

/** Circuitry away from the road — behind the copy, out in the gutters, in the corners. */
interface Field {
  traces: string[];
  pads: Pad[];
  chips: Chip[];
}

interface Board {
  width: number;
  height: number;
  /** The road itself. */
  road: string;
  /** Companion traces running alongside it. */
  bus: string[];
  vias: { x: number; y: number }[];
  branches: string[];
  pads: Pad[];
  chips: Chip[];
  field: Field;
  /** The road's x at any document y — how the ball is placed, without measuring the path. */
  roadX: (y: number) => number;
  /** Identity of the measurement, so an unchanged page does not rebuild the board. */
  signature: string;
}

/**
 * Document-space y of every section edge, in order.
 *
 * `[data-tone-anchor]` is already on every public section for the ambient
 * background's benefit; reusing it means the road stays in step with the page
 * without any section having to opt in.
 *
 * Edges closer together than about half a viewport are merged. Every edge costs
 * the wave a quarter turn, so a short gap between two of them spends that
 * quarter turn in a couple of hundred pixels: the road whips across the page and
 * takes the ball with it. Adjacent sections sharing an edge, and the top of the
 * document sitting just above the first section, are both this case.
 */
function readSectionEdges(): number[] {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-tone-anchor]"));
  const offset = window.scrollY;
  const minimum = Math.max(MIN_SEGMENT, window.innerHeight * 0.45);

  const edges = [
    // The top of the document is an edge too. Without it the header would be
    // mid-swing and the road would not start in the corner.
    0,
    ...sections
      .flatMap((section) => {
        const rect = section.getBoundingClientRect();
        return [rect.top + offset, rect.bottom + offset];
      })
      .sort((a, b) => a - b),
  ];

  const kept: number[] = [];
  for (const edge of edges) {
    if (kept.length === 0 || edge - kept[kept.length - 1]! >= minimum) kept.push(edge);
  }

  // Whatever the merge dropped off the end, the bottom of the last section is
  // still where the wave ought to arrive.
  const last = edges[edges.length - 1]!;
  if (kept.length > 1 && last > kept[kept.length - 1]!) kept[kept.length - 1] = last;

  return kept;
}

/**
 * Maps a document y to a phase on the sine.
 *
 * The knots are the section edges, each a quarter turn further along than the
 * one before it. Between them the phase is interpolated with a cubic rather than
 * a straight line, and that is the difference between a sine and what this used
 * to draw: straight-line phase makes the *rate* of the wave change in a step at
 * every edge, so the road gets a corner there and the ball's sideways speed
 * changes instantly. Sections are never the same height, so this happened at
 * every boundary between two sections of unequal length.
 *
 * A cubic with matched tangents has neither — the wave still breathes with the
 * sections, but the period changes continuously instead of all at once. Tangents
 * are the Fritsch–Carlson harmonic mean, which cannot overshoot, so the phase
 * stays monotonic and the road never doubles back on itself.
 *
 * Above the first knot and below the last, the phase carries on at that knot's
 * own rate, so the header and footer are not a flat stub at either end.
 */
function phaseMapper(edges: number[], fallbackSpan: number): (y: number) => number {
  if (edges.length < 2) {
    return (y) => START_PHASE + (y / fallbackSpan) * PHASE_PER_SECTION;
  }

  const count = edges.length;
  const phases = edges.map((_, index) => START_PHASE + index * PHASE_PER_SECTION);
  /** Phase per pixel across each span… */
  const slopes = edges.slice(1).map((edge, index) => PHASE_PER_SECTION / (edge - edges[index]!));
  /** …and the single rate at each knot, shared by the spans on both sides of it. */
  const tangents = edges.map((_, index) => {
    if (index === 0) return slopes[0]!;
    if (index === count - 1) return slopes[count - 2]!;

    const before = slopes[index - 1]!;
    const after = slopes[index]!;
    return (2 * before * after) / (before + after);
  });

  const first = edges[0]!;
  const last = edges[count - 1]!;

  return (y) => {
    if (y <= first) return phases[0]! + (y - first) * tangents[0]!;
    if (y >= last) return phases[count - 1]! + (y - last) * tangents[count - 1]!;

    let index = 0;
    while (index < count - 2 && edges[index + 1]! <= y) index += 1;

    const span = edges[index + 1]! - edges[index]!;
    const t = (y - edges[index]!) / span;
    const t2 = t * t;
    const t3 = t2 * t;

    // Cubic Hermite: value at both ends, tangent at both ends.
    return (
      (2 * t3 - 3 * t2 + 1) * phases[index]! +
      (t3 - 2 * t2 + t) * span * tangents[index]! +
      (-2 * t3 + 3 * t2) * phases[index + 1]! +
      (t3 - t2) * span * tangents[index + 1]!
    );
  };
}

/**
 * Branch routing, in the house style of a real board: straight run, 45° turn,
 * straight run again. Corners are mitred because acid traps at sharp angles are
 * why boards are routed this way — the detail is what makes it read as a PCB
 * rather than as decoration.
 */
function routeBranch(
  x: number,
  y: number,
  side: number,
  random: () => number,
  width: number,
): { d: string; endX: number; endY: number } | null {
  const limit = side > 0 ? width - EDGE_PADDING : EDGE_PADDING;

  const run = 14 + random() * 26;
  const diagonal = 20 + random() * 44;
  const tail = 12 + random() * 74;
  const vertical = random() < 0.5 ? -1 : 1;

  const cornerX = x + side * run;
  const turnX = cornerX + side * diagonal;
  const turnY = y + vertical * diagonal;
  const endX = turnX + side * tail;

  // A branch that cannot complete its turn inside the board is dropped rather
  // than squashed — a clipped elbow looks like a bug, a missing branch does not.
  if (side > 0 ? turnX > limit : turnX < limit) return null;

  const stop = side > 0 ? Math.min(endX, limit) : Math.max(endX, limit);

  return {
    d: `M ${x.toFixed(1)} ${y.toFixed(1)} L ${cornerX.toFixed(1)} ${y.toFixed(1)} L ${turnX.toFixed(1)} ${turnY.toFixed(1)} L ${stop.toFixed(1)} ${turnY.toFixed(1)}`,
    endX: stop,
    endY: turnY,
  };
}

/**
 * A short stub of routing somewhere out on the board, in any of the four
 * quadrants: run, 45° elbow, run again. Same idiom as `routeBranch`, but it
 * belongs to no trace — which is exactly how the empty acreage of a real board
 * looks between its components.
 */
function routeField(
  x: number,
  y: number,
  random: () => number,
  width: number,
): { d: string; endX: number; endY: number } | null {
  const side = random() < 0.5 ? -1 : 1;
  const vertical = random() < 0.5 ? -1 : 1;

  const run = 14 + random() * 34;
  const diagonal = 14 + random() * 30;
  const tail = 10 + random() * 44;

  const cornerX = x + side * run;
  const turnX = cornerX + side * diagonal;
  const turnY = y + vertical * diagonal;
  const endX = turnX + side * tail;

  if (endX < EDGE_PADDING || endX > width - EDGE_PADDING) return null;

  return {
    d: `M ${x.toFixed(1)} ${y.toFixed(1)} L ${cornerX.toFixed(1)} ${y.toFixed(1)} L ${turnX.toFixed(1)} ${turnY.toFixed(1)} L ${endX.toFixed(1)} ${turnY.toFixed(1)}`,
    endX,
    endY: turnY,
  };
}

/**
 * The ambient circuitry: a jittered grid of stubs and landings covering the
 * whole board, thinned out near the road so the two densities never compete.
 */
function buildField(
  width: number,
  height: number,
  random: () => number,
  roadX: (y: number) => number,
): Field {
  const traces: string[] = [];
  const pads: Pad[] = [];
  const chips: Chip[] = [];
  const clearance = Math.min(FIELD_CLEARANCE, width * 0.2);

  for (let row = FIELD_CELL_Y * 0.4; row < height; row += FIELD_CELL_Y) {
    for (let column = FIELD_CELL_X * 0.5; column < width; column += FIELD_CELL_X) {
      // Jitter, then gaps: a perfect lattice reads as wallpaper, and a board is
      // never populated edge to edge anyway.
      const x = column + (random() - 0.5) * FIELD_CELL_X * 0.62;
      const y = row + (random() - 0.5) * FIELD_CELL_Y * 0.62;
      if (random() < 0.24) continue;
      if (x < EDGE_PADDING + 18 || x > width - EDGE_PADDING - 18) continue;
      if (Math.abs(x - roadX(y)) < clearance) continue;

      const stub = routeField(x, y, random, width);
      if (!stub) continue;

      traces.push(stub.d);
      pads.push({ x, y, r: 2 + random() * 1.4 });

      const chipWidth = 20 + random() * 26;
      const chipHeight = 11 + random() * 9;
      const chipX = stub.endX > x ? stub.endX : stub.endX - chipWidth;

      if (random() < 0.34 && chipX > EDGE_PADDING && chipX + chipWidth < width - EDGE_PADDING) {
        chips.push({
          x: chipX,
          y: stub.endY - chipHeight / 2,
          width: chipWidth,
          height: chipHeight,
          pins: 2 + Math.floor(random() * 3),
        });
      } else {
        pads.push({ x: stub.endX, y: stub.endY, r: 1.6 + random() * 1.6 });
      }
    }
  }

  return { traces, pads, chips };
}

/**
 * The sampled wave as cubic Béziers rather than straight segments.
 *
 * Uniform Catmull-Rom converted to Bézier control points: with the samples
 * evenly spaced in y, the tangent at each one is a sixth of the vector between
 * its neighbours. Joining the same samples with `L` leaves a facet at every node,
 * which is plainly visible once the trace is stroked eleven pixels wide.
 *
 * `shift` is what lets the bus lines reuse the road's own samples — the curve is
 * translated, so the offset traces stay exactly parallel to it.
 */
function smoothPath(points: { x: number; y: number }[], shift: number): string {
  if (points.length < 2) return "";

  const at = (index: number) => {
    const point = points[Math.min(points.length - 1, Math.max(0, index))]!;
    return { x: point.x + shift, y: point.y };
  };

  const parts = [`M ${at(0).x.toFixed(1)} ${at(0).y.toFixed(1)}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const before = at(index - 1);
    const from = at(index);
    const to = at(index + 1);
    const after = at(index + 2);

    const c1x = from.x + (to.x - before.x) / 6;
    const c1y = from.y + (to.y - before.y) / 6;
    const c2x = to.x - (after.x - from.x) / 6;
    const c2y = to.y - (after.y - from.y) / 6;

    parts.push(
      `C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
    );
  }

  return parts.join(" ");
}

function buildBoard(width: number, height: number, edges: number[]): Board {
  const centre = width / 2;
  // The swing runs almost the full width so the trough at y = 0 lands in the
  // corner. `centre - 46` is what stops it there: the ball's halo is 26 across
  // and still needs to clear the edge.
  const amplitude = Math.max(40, Math.min(centre - 46, width * 0.46));
  const phaseAt = phaseMapper(edges, Math.max(1, window.innerHeight));
  const roadX = (y: number) => centre + amplitude * Math.sin(phaseAt(y));

  const points: { x: number; y: number }[] = [];
  for (let y = 0; y <= height; y += SAMPLE_STEP) {
    points.push({ x: roadX(y), y });
  }
  if (points[points.length - 1]!.y < height) {
    points.push({ x: roadX(height), y: height });
  }

  const trace = (shift: number) => smoothPath(points, shift);

  const random = mulberry32(0x51ce);
  const stride = Math.max(1, Math.round(VIA_SPACING / SAMPLE_STEP));

  const vias: Board["vias"] = [];
  const branches: string[] = [];
  const pads: Pad[] = [];
  const chips: Chip[] = [];

  for (let index = stride; index < points.length - 1; index += stride) {
    const point = points[index]!;
    const step = index / stride;
    vias.push(point);

    // Alternating sides keep the board balanced; the occasional flip keeps it
    // from reading as a zip.
    const side = (step % 2 === 0 ? 1 : -1) * (random() < 0.18 ? -1 : 1);
    const branch = routeBranch(point.x, point.y, side, random, width);
    if (!branch) continue;

    branches.push(branch.d);

    const chipWidth = 26 + random() * 30;
    const chipHeight = 14 + random() * 12;
    const chipX = side > 0 ? branch.endX : branch.endX - chipWidth;
    const roomForChip =
      chipX > EDGE_PADDING && chipX + chipWidth < width - EDGE_PADDING && step % 3 === 1;

    if (roomForChip) {
      chips.push({
        x: chipX,
        y: branch.endY - chipHeight / 2,
        width: chipWidth,
        height: chipHeight,
        pins: 3 + Math.floor(random() * 3),
      });
    } else {
      pads.push({ x: branch.endX, y: branch.endY, r: 2.6 + random() * 1.8 });
    }

    // A couple of loose pads near the trace: a board is never routed to exactly
    // as many landings as it has branches.
    if (random() < 0.5) {
      const strayX = point.x + side * (60 + random() * 150);
      if (strayX > EDGE_PADDING && strayX < width - EDGE_PADDING) {
        pads.push({ x: strayX, y: point.y + (random() - 0.5) * 120, r: 1.6 + random() * 1.4 });
      }
    }
  }

  return {
    width,
    height,
    road: trace(0),
    bus: BUS_OFFSETS.map(trace),
    vias,
    branches,
    pads,
    chips,
    // Built last so it draws from the same PRNG stream — the board stays
    // deterministic as a whole, not just section by section.
    field: buildField(width, height, random, roadX),
    roadX,
    signature: `${width}x${Math.round(height)}:${edges.length}`,
  };
}

/* ------------------------------------------------------------------ art -- */

/**
 * The board, drawn once dull and once bright. The bright copy is masked to the
 * length of trace the ball has already covered, which is the whole trick: one
 * set of shapes, two states, and the boundary between them is a rectangle.
 */
function Chips({ chips }: { chips: Chip[] }) {
  return chips.map((chip, index) => (
    <g key={index}>
      {Array.from({ length: chip.pins }, (_, pin) => {
        const gap = chip.height / (chip.pins + 1);
        const y = chip.y + gap * (pin + 1) - 1;
        return (
          <g key={pin}>
            <rect x={chip.x - 4} y={y} width={4} height={2} className="circuit-pin" />
            <rect x={chip.x + chip.width} y={y} width={4} height={2} className="circuit-pin" />
          </g>
        );
      })}
      <rect
        x={chip.x}
        y={chip.y}
        width={chip.width}
        height={chip.height}
        rx={2}
        className="circuit-chip"
      />
    </g>
  ));
}

function Pads({ pads }: { pads: Pad[] }) {
  return pads.map((pad, index) => (
    <circle key={index} cx={pad.x} cy={pad.y} r={pad.r} className="circuit-pad" />
  ));
}

function BoardArt({ board, className }: { board: Board; className: string }) {
  return (
    <g className={className}>
      {/* Everywhere the road is not: behind the copy, in the gutters, in the
          corners. Held back by opacity so it never fights the text over it. */}
      <g className="circuit-field">
        {board.field.traces.map((d, index) => (
          <path key={index} d={d} className="circuit-branch" />
        ))}
        <Chips chips={board.field.chips} />
        <Pads pads={board.field.pads} />
      </g>

      {board.bus.map((d, index) => (
        <path key={index} d={d} className="circuit-bus" />
      ))}

      <path d={board.road} className="circuit-road-casing" />
      <path d={board.road} className="circuit-road-line" />
      <path d={board.road} className="circuit-road-dash" />

      {board.branches.map((d, index) => (
        <path key={index} d={d} className="circuit-branch" />
      ))}

      <Chips chips={board.chips} />
      <Pads pads={board.pads} />

      {board.vias.map((via, index) => (
        <g key={index}>
          <circle cx={via.x} cy={via.y} r={5} className="circuit-via" />
          <circle cx={via.x} cy={via.y} r={1.7} className="circuit-via-hole" />
        </g>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------ component -- */

export function CircuitRoad() {
  const pathname = usePathname();
  const [board, setBoard] = useState<Board | null>(null);

  const ballRef = useRef<SVGGElement>(null);
  const litRef = useRef<SVGRectElement>(null);
  const fadeRef = useRef<SVGRectElement>(null);
  /** The ball's document y, held outside the effect so a rebuild does not restart it. */
  const ballYRef = useRef<number | null>(null);

  // `useId` is punctuated, and punctuation inside `url(#…)` is a fight nobody wins.
  const maskId = `circuit-lit-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  /*
   * Measurement. Re-run on resize, on navigation, and whenever the body's own
   * size changes — images finishing, a section expanding — because the road's
   * height is the document's height and a stale one would stop short.
   */
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;

      const width = document.documentElement.clientWidth;
      const height = document.documentElement.scrollHeight;
      if (width < 320 || height < 320) return;

      const edges = readSectionEdges();
      const signature = `${width}x${Math.round(height)}:${edges.length}`;

      // Rebuilding an identical board would throw away the DOM and, with it,
      // the ball's position mid-scroll.
      setBoard((current) =>
        current?.signature === signature ? current : buildBoard(width, height, edges),
      );
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();

    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  /*
   * The ball. It is not pinned to the scroll position — it *chases* a target,
   * and the target is the middle of the viewport.
   *
   * That is what gives it its behaviour for free. At rest the ball is exactly
   * mid-screen. Scroll, and the target moves out from under it, so the ball
   * trails behind by an amount proportional to how fast the page is moving —
   * it holds the middle of the screen at reading speed and falls back a little
   * when the page is thrown. Stop, and it glides back to the centre. On load it
   * starts at the top of the road and slides down to the middle, because the
   * top of the road is simply where it begins and the middle is where it is
   * always heading.
   *
   * The easing is exponential, made frame-rate independent so a 120Hz display
   * does not travel twice as fast as a 60Hz one. The loop is not a permanent
   * ticker: it runs while the ball is moving and stops the moment it arrives,
   * and scroll wakes it again.
   *
   * React is not involved — this writes three attributes per frame. And nothing
   * here reads layout: `scrollHeight` used to be read every frame, which forces
   * the browser to flush layout before it can answer, and on a page this tall
   * that is a frame's work per frame. The height is the one the board was built
   * for, and the viewport only changes on resize.
   */
  useEffect(() => {
    if (!board) return;

    const ball = ballRef.current;
    const lit = litRef.current;
    const fade = fadeRef.current;
    if (!ball || !lit || !fade) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let previous = 0;
    let scrollable = Math.max(1, board.height - window.innerHeight);
    // Kept across board rebuilds — a resize mid-scroll must not send the ball
    // back to the top of the page to start its entrance over again.
    let position = ballYRef.current ?? 0;
    let arrived = ballYRef.current !== null;

    /** Document y the ball is heading for: mid-viewport, the end of the road at the end of the page. */
    const target = () => {
      const viewport = window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      // Smoothstepped so the hand-off from "hold the centre" to "run to the
      // end" has no kink in it — the ball must not visibly change gear.
      const t = Math.max(0, (progress - TAIL_START) / (1 - TAIL_START));
      const anchor = BALL_ANCHOR + (1 - BALL_ANCHOR) * t * t * (3 - 2 * t);

      return Math.min(board.height, window.scrollY + viewport * anchor);
    };

    const paint = () => {
      const x = board.roadX(position);

      ball.setAttribute("transform", `translate(${x.toFixed(2)} ${position.toFixed(2)})`);
      lit.setAttribute("height", position.toFixed(1));
      fade.setAttribute("y", position.toFixed(1));
    };

    const step = (now: number) => {
      // A tab that was backgrounded returns with an enormous gap; clamped, or
      // the ball teleports on the first frame back.
      const elapsed = previous ? Math.min(64, now - previous) : 16.7;
      previous = now;

      const distance = target() - position;

      if (Math.abs(distance) < SETTLED || still.matches) {
        position += distance;
        arrived = true;
        ballYRef.current = position;
        paint();
        frame = 0;
        return;
      }

      const ease = arrived ? CHASE_EASE : ENTRY_EASE;
      position += distance * (1 - Math.pow(1 - ease, elapsed / 16.7));
      ballYRef.current = position;
      paint();

      frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (frame) return;
      // Reset, so the first frame of a fresh run measures against itself rather
      // than against however long the ball has been sitting still.
      previous = 0;
      frame = requestAnimationFrame(step);
    };

    const remeasure = () => {
      scrollable = Math.max(1, board.height - window.innerHeight);
      wake();
    };

    paint();
    wake();

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", remeasure);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", remeasure);
    };
  }, [board]);

  return (
    <div aria-hidden="true" className="circuit-board" style={{ height: board?.height ?? 0 }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {board ? (
        <svg width={board.width} height={board.height} className="circuit-svg">
          <defs>
            <linearGradient id={`${maskId}-fade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="100%" stopColor="#000" />
            </linearGradient>

            <radialGradient id={`${maskId}-halo`}>
              <stop offset="0%" className="circuit-halo-in" />
              <stop offset="100%" className="circuit-halo-out" />
            </radialGradient>

            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={board.width} height={board.height}>
              <rect ref={litRef} x="0" y="0" width={board.width} height="0" fill="#fff" />
              <rect
                ref={fadeRef}
                x="0"
                y="0"
                width={board.width}
                height="150"
                fill={`url(#${maskId}-fade)`}
              />
            </mask>
          </defs>

          <BoardArt board={board} className="circuit-dull" />
          <g mask={`url(#${maskId})`}>
            <BoardArt board={board} className="circuit-live" />
          </g>

          <g ref={ballRef} className="circuit-ball">
            <circle r={26} fill={`url(#${maskId}-halo)`} className="circuit-ball-halo" />
            <circle r={7.5} className="circuit-ball-core" />
            <circle r={3} className="circuit-ball-spark" />
          </g>
        </svg>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- css --- */

/*
 * Scoped to `.circuit-board` and injected with the component so removing the
 * mount removes the styles too. Unlayered on purpose: `globals.css` puts its
 * rules in `@layer`, and unlayered declarations win over layered ones no matter
 * what order they arrive in.
 */
const STYLES = `
.circuit-board {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: -9;
  overflow: hidden;
  pointer-events: none;

  --circuit-line: rgba(30, 64, 175, 0.20);
  --circuit-faint: rgba(30, 64, 175, 0.10);
  --circuit-fill: rgba(30, 64, 175, 0.06);
  --circuit-lit: rgba(2, 132, 199, 0.95);
  --circuit-lit-soft: rgba(2, 132, 199, 0.22);
  --circuit-ball: #ea580c;
  --circuit-ball-halo: rgba(234, 88, 12, 0.30);
  --circuit-grid: rgba(30, 64, 175, 0.05);
  --circuit-bg: #fbfaf9;

  background-image: radial-gradient(circle, var(--circuit-grid) 1px, transparent 1.3px);
  background-size: 32px 32px;
}

.dark .circuit-board {
  --circuit-line: rgba(125, 211, 252, 0.20);
  --circuit-faint: rgba(125, 211, 252, 0.10);
  --circuit-fill: rgba(125, 211, 252, 0.05);
  --circuit-lit: rgba(56, 189, 248, 0.95);
  --circuit-lit-soft: rgba(56, 189, 248, 0.20);
  --circuit-ball: #fb923c;
  --circuit-ball-halo: rgba(251, 146, 60, 0.36);
  --circuit-grid: rgba(125, 211, 252, 0.045);
  --circuit-bg: #0c0a09;
}

.circuit-svg {
  display: block;
}

/* The trace: a wide casing, a conductor, and a dashed centreline over the top. */
.circuit-road-casing,
.circuit-road-line,
.circuit-road-dash,
.circuit-bus,
.circuit-branch {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.circuit-road-casing { stroke: var(--circuit-faint); stroke-width: 11; }
.circuit-road-line   { stroke: var(--circuit-line);  stroke-width: 2.5; }
.circuit-road-dash   { stroke: var(--circuit-line);  stroke-width: 1; stroke-dasharray: 2 12; opacity: 0.75; }
.circuit-bus         { stroke: var(--circuit-faint); stroke-width: 1.2; stroke-dasharray: 26 9; }
.circuit-branch      { stroke: var(--circuit-line);  stroke-width: 1.4; }

/*
 * Ambient circuitry sits under the copy, so it is held to about half weight.
 * It is the same shapes as the road's — the board is one board, just thinner
 * where nothing important is routed.
 */
.circuit-field { opacity: 0.5; }
.circuit-field .circuit-branch { stroke-width: 1.1; }

.circuit-via      { fill: var(--circuit-bg); stroke: var(--circuit-line); stroke-width: 1.8; }
.circuit-via-hole { fill: var(--circuit-line); }
.circuit-pad      { fill: var(--circuit-line); }
.circuit-pin      { fill: var(--circuit-line); }
.circuit-chip     { fill: var(--circuit-fill); stroke: var(--circuit-line); stroke-width: 1.2; }

/*
 * The lit copy. The glow is the casing re-stroked wide and translucent under a
 * bright conductor — no filter, so nothing rasterises the full document.
 */
.circuit-live .circuit-road-casing { stroke: var(--circuit-lit-soft); stroke-width: 14; }
.circuit-live .circuit-road-line   { stroke: var(--circuit-lit); stroke-width: 2.5; }
.circuit-live .circuit-road-dash   { stroke: var(--circuit-bg); opacity: 0.55; }
.circuit-live .circuit-bus         { stroke: var(--circuit-lit); opacity: 0.5; }
.circuit-live .circuit-branch      { stroke: var(--circuit-lit); opacity: 0.75; }
.circuit-live .circuit-via         { stroke: var(--circuit-lit); }
.circuit-live .circuit-via-hole,
.circuit-live .circuit-pad,
.circuit-live .circuit-pin         { fill: var(--circuit-lit); }
.circuit-live .circuit-chip        { stroke: var(--circuit-lit); fill: var(--circuit-lit-soft); }
.circuit-live .circuit-field       { opacity: 0.72; }

.circuit-halo-in  { stop-color: var(--circuit-ball-halo); }
.circuit-halo-out { stop-color: var(--circuit-ball-halo); stop-opacity: 0; }

.circuit-ball-core  { fill: var(--circuit-ball); }
.circuit-ball-spark { fill: #fff; opacity: 0.9; }

.circuit-ball-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: circuit-pulse 2.6s ease-in-out infinite alternate;
}

@keyframes circuit-pulse {
  from { transform: scale(0.82); opacity: 0.7; }
  to   { transform: scale(1.18); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .circuit-ball-halo { animation: none !important; transform: none; }
}
`;
