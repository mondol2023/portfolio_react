"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import dynamic from "next/dynamic";
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

import { TechChain } from "@/components/skills/tech-chain";
import { SPRING } from "@/lib/experience/springs";
import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import {
  PROFICIENCY_LABELS,
  SKILL_CATEGORY_LABELS,
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
 */

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
 * detail panel and the keyboard list.
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const layout = useMemo(() => buildGalaxy(skills, nodeBudget), [skills, nodeBudget]);
  const selected = skills.find((skill) => skill.id === selectedId) ?? null;
  const hovered = skills.find((skill) => skill.id === hoveredId) ?? null;

  // The budget may have left a skill out of the sky. It still has a button and
  // still opens the panel — but the camera is not sent to a planet that was
  // never placed.
  const placed = useMemo(() => new Set(layout.nodes.map((node) => node.id)), [layout.nodes]);
  const sceneSelectedId = selectedId && placed.has(selectedId) ? selectedId : null;

  // Tooltip position. Motion values, so following the pointer never re-renders
  // the section — springs give it the same weight as the cursor.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tipX = useSpring(pointerX, SPRING.trail);
  const tipY = useSpring(pointerY, SPRING.trail);

  function trackPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - rect.left);
    pointerY.set(event.clientY - rect.top);
  }

  function toggle(id: string) {
    // A second press on the same skill releases the camera — the focus is a
    // toggle, not a trap, and there is nothing else obvious to click.
    setSelectedId((current) => (current === id ? null : id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
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
          onHover={setHoveredId}
          onSelect={toggle}
        />

        <AnimatePresence>
          {finePointer && hovered ? (
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

        <p className="label-mono pointer-events-none absolute bottom-4 left-5 text-fg-subtle">
          Drag to turn the system
        </p>
      </div>

      <SkillDetail skill={selected} onClear={() => setSelectedId(null)} />

      <ul className="flex flex-wrap gap-2 lg:col-span-2">
        {skills.map((skill) => (
          <li key={skill.id}>
            <button
              type="button"
              aria-pressed={skill.id === selectedId}
              onClick={() => toggle(skill.id)}
              // Focus lights the planet as a hover would, so tabbing through
              // the list is the same experience as running a mouse over the sky.
              onFocus={() => setHoveredId(skill.id)}
              onBlur={() => setHoveredId((current) => (current === skill.id ? null : current))}
              onPointerEnter={() => setHoveredId(skill.id)}
              onPointerLeave={() => setHoveredId((current) => (current === skill.id ? null : current))}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                skill.id === selectedId
                  ? "border-tone bg-tone-soft text-tone"
                  : "border-border text-fg-muted hover:border-tone/50 hover:text-fg",
              )}
            >
              {skill.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
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
          >
            <p className="label-mono text-tone">{SKILL_CATEGORY_LABELS[skill.category]}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{skill.name}</h3>

            {skill.proficiency ? (
              <p className="mt-1 text-sm text-fg-muted">{PROFICIENCY_LABELS[skill.proficiency]}</p>
            ) : null}

            {skill.description ? (
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">{skill.description}</p>
            ) : null}

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
