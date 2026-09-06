"use client";

import { Orbit } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, type ReactNode, useState } from "react";

import { useCssColors } from "@/lib/experience/use-css-colors";
import { usePointer } from "@/lib/experience/use-pointer";
import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import { useGameProgress } from "@/lib/hooks/use-game-progress";
import { gameStore } from "@/lib/store/game-store";
import { PROFICIENCY_LABELS, SKILL_CATEGORY_LABELS, type Skill } from "@/lib/types/content";

/**
 * "Explore the stack in 3D" — an opt-in companion to `TechChain`, never a
 * replacement for it. The chain above already shows every technology in a
 * form every visitor (and every crawler) can read; this is Game Mode's extra
 * layer on top of that, built on the same `lib/experience/*` budget/pointer/
 * visibility plumbing `HeroCore` uses.
 *
 * Two gates, not one: `mode !== "game"` hides the toggle itself, and the
 * canvas module is only `dynamic()`-imported after that toggle is actually
 * clicked (`open`). So a Normal Mode visitor, and a Game Mode visitor who
 * never opens this, both pay nothing for `three`.
 */

const SkillGalaxyScene = dynamic(() => import("./skill-galaxy-scene").then((mod) => mod.SkillGalaxyScene), {
  ssr: false,
  loading: () => null,
});

/** The galaxy is a bonus view, not the source of truth — a WebGL failure here renders nothing. */
class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SkillGalaxy({ skills }: { skills: Skill[] }) {
  const { mode } = useGameProgress();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ref, active] = useSceneActive<HTMLDivElement>();
  const budget = useSceneBudget();
  const pointer = usePointer();
  const colors = useCssColors(["--tone", "--tone-soft"], '[data-tone="stack"]');

  if (mode !== "game" || skills.length === 0) return null;

  // Every technology is real content, so the budget only ever caps the *3D*
  // view on weak hardware — the chain above it, which has no node limit,
  // always shows the full list regardless of what happens here.
  const nodeSkills = skills.slice(0, budget.galaxyNodes);
  const capped = nodeSkills.length < skills.length;
  const selected = nodeSkills.find((skill) => skill.id === selectedId) ?? null;

  // Mirrors `TechChain`'s select(): only a genuine new selection counts as
  // "discovering" the skill, and a second click on the same node closes it.
  const select = (id: string) => {
    if (selectedId !== id) gameStore.viewSkill(id);
    setSelectedId((current) => (current === id ? null : id));
  };

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-fg-muted transition-colors duration-200 hover:border-border-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Orbit className="size-4 text-tone" aria-hidden="true" />
          {open ? "Hide the 3D view" : "Explore the stack in 3D"}
        </button>
        {open && capped ? (
          <p className="text-xs text-fg-subtle">
            Showing {nodeSkills.length} of {skills.length} — the full list is above.
          </p>
        ) : null}
      </div>

      {open ? (
        <div className="mt-6">
          <div
            ref={ref}
            className="relative h-[24rem] w-full overflow-hidden rounded-2xl border border-border bg-bg-subtle/40 sm:h-[28rem]"
          >
            <SceneErrorBoundary>
              <SkillGalaxyScene
                active={active}
                budget={budget}
                pointer={pointer}
                tone={colors["--tone"] ?? "#f97316"}
                toneSoft={colors["--tone-soft"] ?? "#fdba74"}
                skills={nodeSkills}
                selectedId={selectedId}
                onSelect={select}
              />
            </SceneErrorBoundary>
          </div>

          {/*
           * Screen reader and keyboard-only visitors get the same selection
           * through real buttons — the canvas above is a pointer affordance
           * layered on top of this, not a replacement for it.
           */}
          <div className="sr-only">
            <p>Technologies in this view:</p>
            <ul>
              {nodeSkills.map((skill) => (
                <li key={skill.id}>
                  <button type="button" onClick={() => select(skill.id)}>
                    {skill.name}, {SKILL_CATEGORY_LABELS[skill.category]}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p
            aria-live="polite"
            className="mt-4 flex min-h-10 flex-col items-center justify-center gap-1 text-center text-sm text-fg-muted"
          >
            {selected ? (
              <span>
                <span className="font-medium text-fg">{selected.name}</span>
                <span aria-hidden="true" className="px-2 text-fg-subtle">
                  ·
                </span>
                <span className="text-tone">{SKILL_CATEGORY_LABELS[selected.category]}</span>
                {selected.proficiency ? (
                  <>
                    <span aria-hidden="true" className="px-2 text-fg-subtle">
                      ·
                    </span>
                    {PROFICIENCY_LABELS[selected.proficiency]}
                  </>
                ) : null}
              </span>
            ) : (
              <span className="text-fg-subtle">Click a star to see what it is.</span>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
