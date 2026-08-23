"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  type MotionValue,
} from "motion/react";
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { EASE_OUT } from "@/components/motion/variants";
import { TechChain } from "@/components/skills/tech-chain";
import { skillCategoryColor } from "@/lib/constants/skill-palette";
import { SPRING } from "@/lib/experience/springs";
import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import {
  PROFICIENCY_LABELS,
  PROFICIENCY_LEVELS,
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
  type ProficiencyLevel,
  type Skill,
} from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";

import { buildGalaxy } from "./galaxy-layout";

/**
 * Skill universe — the stack as a solar system, with a way out of it.
 *
 * Two views of the same content. **Universe** is the galaxy: planets on
 * category orbits, drag to turn, click to fly the camera out to one.
 * **Chain** is the existing scrolling conveyor of pills. The toggle is visible
 * to everyone, because "which of these do I want" is a preference and not
 * something a device query should settle on the visitor's behalf — but the
 * *default* is settled that way: reduced motion and low-tier hardware start on
 * Chain, which asks nothing of the GPU.
 *
 * Selection lives here rather than in the scene, so the canvas and the list of
 * buttons underneath it are two views of one state. That list is the whole
 * keyboard story: every planet is a `<button>`, focusing one lights it in the
 * galaxy, and pressing it focuses the camera. Nothing in this section is
 * reachable only by aiming a mouse at a moving object.
 *
 * Colour is the thread between the two halves. Each category owns a hue —
 * `--skill-*` in `globals.css` — and it is used in exactly two places: the
 * planets and rings in the sky, and the chips underneath. Pressing an amber
 * chip lights an amber world, and the link needs no caption.
 */

const PROFICIENCY_RANK: Record<ProficiencyLevel, number> = {
  learning: 1,
  working: 2,
  proficient: 3,
  expert: 4,
};

/**
 * A skill's `description` is optional and, in practice, the field owners
 * fill in least — most skills carry only a category and a proficiency. A
 * card with neither reads as broken rather than sparse, so this composes a
 * one-line sentence from the two fields that are almost always real instead
 * of leaving the card to fall back on nothing.
 */
const PROFICIENCY_BLURB: Record<ProficiencyLevel, string> = {
  learning: "Currently picking this up.",
  working: "Comfortable using it day to day.",
  proficient: "A reliable part of the toolkit.",
  expert: "A daily driver — deep, frequent use.",
};

function skillBlurb(skill: Skill): string {
  const category = SKILL_CATEGORY_LABELS[skill.category].toLowerCase();
  if (!skill.proficiency) return `One of the ${category} tools in the stack.`;
  return PROFICIENCY_BLURB[skill.proficiency];
}

/** Four filled/empty dots reading the same proficiency the label states in
 * words — a glanceable version for the card, where the meter has room a
 * label alone would waste. */
function ProficiencyMeter({ level }: { level: ProficiencyLevel }) {
  const rank = PROFICIENCY_RANK[level];
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {PROFICIENCY_LEVELS.map((step) => (
        <span
          key={step}
          className={cn(
            "size-1.5 rounded-full",
            PROFICIENCY_RANK[step] <= rank ? "bg-[var(--chip)]" : "bg-fg-subtle/30",
          )}
        />
      ))}
    </span>
  );
}

const GalaxyScene = dynamic(() => import("./galaxy-scene"), {
  ssr: false,
  // The stage keeps its border, its grid and its caption while the chunk
  // arrives, so the layout never jumps — there is nothing here worth a spinner.
  loading: () => null,
});

type Mode = "universe" | "chain";

export function SkillUniverse({ skills }: { skills: Skill[] }) {
  const reducedMotion = useMotionPreference();
  const budget = useSceneBudget();

  // `null` means "whatever this device should start with". Once the visitor
  // presses the toggle, their choice outranks the device for the rest of the
  // session.
  const [chosen, setChosen] = useState<Mode | null>(null);
  const fallback: Mode = reducedMotion || budget.tier === "low" ? "chain" : "universe";
  const mode = chosen ?? fallback;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-fg-muted">
          {mode === "universe"
            ? "Every technology is a world; every category an orbit."
            : "One continuous chain of the whole stack."}
        </p>

        <div
          role="group"
          aria-label="Skill display mode"
          className="flex items-center gap-1 rounded-full border border-border bg-surface/70 p-1"
        >
          <ModeButton active={mode === "universe"} onClick={() => setChosen("universe")}>
            Universe
          </ModeButton>
          <ModeButton active={mode === "chain"} onClick={() => setChosen("chain")}>
            Chain
          </ModeButton>
        </div>
      </div>

      <div className="mt-8">
        {mode === "universe" ? (
          <GalaxyStage skills={skills} still={reducedMotion} nodeBudget={budget.galaxyNodes} />
        ) : (
          <TechChain skills={skills} />
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "label-mono rounded-full px-4 py-1.5 transition-colors",
        active ? "bg-tone-soft text-tone" : "text-fg-subtle hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The galaxy and everything that reads it: the canvas, the pointer tooltip, the
 * card that rides above the chosen planet, the detail panel and the keyboard
 * list.
 *
 * A separate component from `SkillUniverse` so that switching to Chain
 * unmounts the canvas outright — the WebGL context, its buffers and the
 * observers watching it all go with it, rather than lingering behind a hidden
 * div.
 */
function GalaxyStage({
  skills,
  still,
  nodeBudget,
}: {
  skills: Skill[];
  still: boolean;
  nodeBudget: number;
}) {
  const [host, active] = useSceneActive<HTMLDivElement>();
  const finePointer = useFinePointer();
  const root = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // The stage's own box, in the same pixel space `CardAnchor` projects into —
  // read once and again on resize, not every frame, since it only changes
  // when the layout does. `PlanetCard` uses it to keep itself from spilling
  // past the canvas edge.
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [host]);

  // A click anywhere outside this whole section — not just outside the
  // canvas — releases the focus, the way a popover dismisses on an outside
  // click. Scoped to while something is actually selected, so an idle galaxy
  // costs nothing. Chips and the "Release focus" button live inside `root`
  // too, so their own handlers still run unbothered; this only ever fires for
  // a click this component had no other opinion about.
  useEffect(() => {
    if (!selectedId) return;

    function handlePointerDown(event: PointerEvent) {
      const container = root.current;
      if (!container || !(event.target instanceof Node)) return;
      if (!container.contains(event.target)) setSelectedId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [selectedId]);

  const layout = useMemo(() => buildGalaxy(skills, nodeBudget), [skills, nodeBudget]);
  const selected = skills.find((skill) => skill.id === selectedId) ?? null;
  const hovered = skills.find((skill) => skill.id === hoveredId) ?? null;

  /** The chips, grouped the way the orbits are: inner ring first. */
  const groups = useMemo(
    () =>
      SKILL_CATEGORIES.map((category) => ({
        category,
        items: skills.filter((skill) => skill.category === category),
      })).filter((group) => group.items.length > 0),
    [skills],
  );

  // The budget may have left a skill out of the sky. It still has a button and
  // still opens the panel — but the camera is not sent to a planet that was
  // never placed, and no card is hung over empty space.
  const placed = useMemo(() => new Set(layout.nodes.map((node) => node.id)), [layout.nodes]);
  const sceneSelectedId = selectedId && placed.has(selectedId) ? selectedId : null;

  // Tooltip position. Motion values, so following the pointer never re-renders
  // the section — springs give it the same weight as the cursor.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tipX = useSpring(pointerX, SPRING.trail);
  const tipY = useSpring(pointerY, SPRING.trail);

  // Where the card sits, in stage pixels. Written by the scene once per frame
  // from the selected planet's projected position — deliberately unsprung,
  // because a spring would trail behind the world it is labelling.
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const anchor = useMemo(() => ({ x: cardX, y: cardY }), [cardX, cardY]);

  function trackPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - rect.left);
    pointerY.set(event.clientY - rect.top);
  }

  function toggle(id: string) {
    // A second press on the same skill releases the camera — the focus is a
    // toggle, not a trap, and there is nothing else obvious to click.
    const next = selectedId === id ? null : id;

    // Opening from nothing: park the card at the middle of the stage so its
    // entrance starts from roughly where the planet is, not from the top-left
    // corner the motion values still hold. The scene overwrites this on its
    // very next frame. Moving between two planets skips it — the card should
    // travel across, not restart from the centre.
    if (next !== null && selectedId === null) {
      const rect = host.current?.getBoundingClientRect();
      if (rect) {
        cardX.set(rect.width / 2);
        cardY.set(rect.height / 2);
      }
    }

    setSelectedId(next);
  }

  return (
    <div ref={root} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <div
        ref={host}
        onPointerMove={trackPointer}
        className="surface-grid relative h-[22rem] overflow-hidden rounded-card border border-border bg-bg-subtle/50 sm:h-[28rem] lg:h-[32rem]"
      >
        <GalaxyScene
          layout={layout}
          active={active}
          still={still}
          selectedId={sceneSelectedId}
          hoveredId={hoveredId}
          anchor={anchor}
          onHover={setHoveredId}
          onSelect={toggle}
          onDismiss={() => setSelectedId(null)}
        />

        <AnimatePresence>
          {/* Never both at once: a planet that is already wearing its card has
              no use for a tooltip repeating its name. */}
          {finePointer && hovered && hovered.id !== sceneSelectedId ? (
            <motion.span
              key="tooltip"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              style={{ x: tipX, y: tipY }}
              // `aria-hidden`: the same name is already in the panel beside it,
              // announced there. This is the mouse's copy.
              aria-hidden="true"
              className="label-mono pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-full border border-tone/40 bg-surface/90 px-3 py-1.5 text-tone backdrop-blur-sm"
            >
              <span className="block translate-x-4 translate-y-4">{hovered.name}</span>
            </motion.span>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {selected && sceneSelectedId ? (
            <PlanetCard
              key={selected.id}
              skill={selected}
              x={cardX}
              y={cardY}
              still={still}
              bounds={stageSize}
            />
          ) : null}
        </AnimatePresence>

        <p className="label-mono pointer-events-none absolute bottom-4 left-5 text-fg-subtle">
          Drag to turn the system
        </p>
      </div>

      <SkillDetail skill={selected} onClear={() => setSelectedId(null)} />

      <div className="lg:col-span-2">
        <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <li
              key={group.category}
              // One custom property per group: the label, the dot and every
              // chip inside inherit it, so a category's hue is set once.
              style={{ "--chip": skillCategoryColor(group.category) } as CSSProperties}
            >
              <p className="label-mono flex items-center gap-2" style={{ color: "var(--chip)" }}>
                <span aria-hidden="true" className="skill-chip-dot size-2 rounded-full" />
                {SKILL_CATEGORY_LABELS[group.category]}
              </p>

              <ul className="mt-3 flex flex-wrap gap-2">
                {group.items.map((skill) => (
                  <li key={skill.id}>
                    <button
                      type="button"
                      aria-pressed={skill.id === selectedId}
                      onClick={() => toggle(skill.id)}
                      // Focus lights the planet as a hover would, so tabbing
                      // through the list is the same experience as running a
                      // mouse over the sky.
                      onFocus={() => setHoveredId(skill.id)}
                      onBlur={() =>
                        setHoveredId((current) => (current === skill.id ? null : current))
                      }
                      onPointerEnter={() => setHoveredId(skill.id)}
                      onPointerLeave={() =>
                        setHoveredId((current) => (current === skill.id ? null : current))
                      }
                      className="skill-chip rounded-full border px-3.5 py-1.5 text-sm"
                    >
                      {skill.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** World units of screen-space clearance the card keeps from the anchor point
 * it is labelling, and from the stage's own edge. */
const CARD_GAP = 14;
const CARD_EDGE = 12;
/** Guess for the very first frame, before the panel has been measured — close
 * to a typical card's real size, so nothing visibly jumps once it is. */
const CARD_SIZE_GUESS = { width: 224, height: 190 };

/**
 * The card that rides above the chosen planet — or below it, or nudged off
 * either side, whichever actually fits.
 *
 * Positioned from motion values the scene writes each frame, so it keeps
 * tracking a world that is still drifting along its orbit without a single
 * re-render for that part. Which *side* of the anchor it sits on is a
 * separate, much lower-frequency decision: measured against the stage's
 * bounds and the panel's own (real, observed — proficiency is optional and
 * changes a card's height) size, and only turned into a re-render on the
 * frames where a side actually flips, via the `current.x === x` guards below.
 * A planet drifting past the middle of the stage costs nothing extra; one
 * crossing an edge costs one state update.
 *
 * `aria-hidden` and `pointer-events-none` for the same reason as the tooltip:
 * everything on it is already in the `aria-live` panel beside the stage, and a
 * card that swallowed clicks would make the galaxy undraggable wherever it
 * happened to be floating.
 */
function PlanetCard({
  skill,
  x,
  y,
  still,
  bounds,
}: {
  skill: Skill;
  x: MotionValue<number>;
  y: MotionValue<number>;
  still: boolean;
  /** The stage's own box, in the same pixel space `x`/`y` are projected into. */
  bounds: { width: number; height: number };
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelSize, setPanelSize] = useState(CARD_SIZE_GUESS);
  const [vertical, setVertical] = useState<"above" | "below">("above");
  const [horizontal, setHorizontal] = useState<"start" | "center" | "end">("center");

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setPanelSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useMotionValueEvent(x, "change", (value) => {
    if (bounds.width <= 0) return;
    const half = panelSize.width / 2;
    const next =
      value - half < CARD_EDGE
        ? "start"
        : value + half > bounds.width - CARD_EDGE
          ? "end"
          : "center";
    setHorizontal((current) => (current === next ? current : next));
  });

  useMotionValueEvent(y, "change", (value) => {
    // Above is preferred — it is what the 3D scene's own `lift` already
    // clears room for — and only given up when the panel would be clipped by
    // the stage's top edge.
    const next: "above" | "below" =
      value - panelSize.height - CARD_GAP < CARD_EDGE ? "below" : "above";
    setVertical((current) => (current === next ? current : next));
  });

  // A CSS property distinct from `transform`, which the `x`/`y` motion values
  // below and the entrance animation on the inner panel both already own —
  // free to flip sides on its own without fighting either.
  const translateX =
    horizontal === "start"
      ? `${CARD_EDGE}px`
      : horizontal === "end"
        ? `calc(-100% - ${CARD_EDGE}px)`
        : "-50%";
  const translateY = vertical === "below" ? `${CARD_GAP}px` : `calc(-100% - ${CARD_GAP}px)`;

  // The tail's own position, in the panel's local pixels — kept in step with
  // whichever edge the panel just nudged itself toward, so it still points at
  // the anchor instead of at the panel's original centre.
  const tailLeft =
    horizontal === "start"
      ? CARD_EDGE
      : horizontal === "end"
        ? panelSize.width - CARD_EDGE
        : panelSize.width / 2;

  return (
    <motion.div
      style={{ x, y }}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-20"
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ duration: still ? 0 : 0.24, ease: EASE_OUT }}
        style={
          {
            "--chip": skillCategoryColor(skill.category),
            borderColor: "color-mix(in srgb, var(--chip) 55%, transparent)",
            boxShadow: "0 20px 45px -28px var(--chip)",
            translate: `${translateX} ${translateY}`,
          } as CSSProperties
        }
        className="w-56 rounded-card border bg-surface/90 p-4 backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="label-mono" style={{ color: "var(--chip)" }}>
            {SKILL_CATEGORY_LABELS[skill.category]}
          </p>
          {skill.proficiency ? <ProficiencyMeter level={skill.proficiency} /> : null}
        </div>

        <p className="mt-1 text-lg font-semibold leading-tight tracking-tight text-fg">
          {skill.name}
        </p>

        {skill.proficiency ? (
          <p className="mt-1 text-xs text-fg-subtle">{PROFICIENCY_LABELS[skill.proficiency]}</p>
        ) : null}

        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-fg-muted">
          {skill.description ?? skillBlurb(skill)}
        </p>

        {/* The tail. A rotated square rather than a border triangle, so it
            takes the same hue, the same backdrop and the same blur as the
            panel it hangs off. Which two edges are visible — and so which way
            it points — flips with `vertical`, the same way its `left` tracks
            `horizontal`. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute size-2.5 -translate-x-1/2 rotate-45 border bg-surface/90",
            vertical === "below" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2",
          )}
          style={{
            left: tailLeft,
            borderColor: "color-mix(in srgb, var(--chip) 55%, transparent)",
            borderWidth: 0,
            borderBottomWidth: vertical === "below" ? 0 : 1,
            borderRightWidth: vertical === "below" ? 0 : 1,
            borderTopWidth: vertical === "below" ? 1 : 0,
            borderLeftWidth: vertical === "below" ? 1 : 0,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

/** What the chosen technology actually is, in words. */
function SkillDetail({ skill, onClear }: { skill: Skill | null; onClear: () => void }) {
  return (
    <aside
      aria-live="polite"
      className="relative min-h-40 rounded-card border border-border bg-surface/70 p-6 backdrop-blur-sm"
    >
      <AnimatePresence mode="wait">
        {skill ? (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22 }}
            style={{ "--chip": skillCategoryColor(skill.category) } as CSSProperties}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="label-mono" style={{ color: "var(--chip)" }}>
                {SKILL_CATEGORY_LABELS[skill.category]}
              </p>
              {skill.proficiency ? <ProficiencyMeter level={skill.proficiency} /> : null}
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{skill.name}</h3>

            {skill.proficiency ? (
              <p className="mt-1 text-sm text-fg-muted">{PROFICIENCY_LABELS[skill.proficiency]}</p>
            ) : null}

            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
              {skill.description ?? skillBlurb(skill)}
            </p>

            <button
              type="button"
              onClick={onClear}
              className="label-mono mt-6 text-fg-subtle transition-colors hover:text-tone"
            >
              [ Release focus ]
            </button>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="text-sm leading-relaxed text-fg-subtle"
          >
            Choose a world — from the sky or from the list below — to bring it forward and read
            where it sits in the stack.
          </motion.p>
        )}
      </AnimatePresence>
    </aside>
  );
}
