"use client";

import { useState } from "react";

import { clearHoveredSkill, publishHoveredSkill } from "@/lib/store/scene-interaction-store";
import { SKILL_CATEGORIES, SKILL_CATEGORY_LABELS, type Skill } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";

/**
 * Blueprint's Skills DOM variant (§4.4, Phase G) — a monospace index grouped
 * by category rather than `tech-chain.tsx`'s scrolling marquee rows, so the
 * switch reads as a different site in the DOM as much as in the canvas.
 * Hover still publishes into `scene-interaction-store.ts`: `schematic.tsx`
 * (the WebGL variant) reads the same `hoveredSkillId` the marquee already
 * writes, so blueprint's graph lights up from this list exactly as it does
 * from the chain in every other scenery.
 */
export function SchematicList({ skills }: { skills: Skill[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = SKILL_CATEGORIES.map((category) => ({
    category,
    items: skills.filter((skill) => skill.category === category).sort((a, b) => a.order - b.order),
  })).filter((group) => group.items.length > 0);

  const active = activeId ? skills.find((skill) => skill.id === activeId) ?? null : null;

  return (
    <div className="font-mono">
      {grouped.map((group) => (
        <div key={group.category} className="mb-7">
          <p className="mb-2.5 text-xs tracking-widest text-fg-subtle uppercase">
            [ {SKILL_CATEGORY_LABELS[group.category]} ]
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
            {group.items.map((skill) => (
              <li key={skill.id}>
                <button
                  type="button"
                  onPointerEnter={() => publishHoveredSkill(skill.id)}
                  onPointerLeave={() => clearHoveredSkill(skill.id)}
                  // Keyboard reaches the same reaction, as it does from the
                  // marquee in every other scenery (Phase L Part 6).
                  onFocus={() => publishHoveredSkill(skill.id)}
                  onBlur={() => clearHoveredSkill(skill.id)}
                  onClick={() => setActiveId((id) => (id === skill.id ? null : skill.id))}
                  className={cn(
                    "border-b border-dashed border-border-strong text-sm text-fg-muted transition-colors duration-150",
                    "hover:border-accent hover:text-fg",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    activeId === skill.id && "border-accent text-accent",
                  )}
                >
                  <span aria-hidden="true" className="text-fg-subtle">
                    {"> "}
                  </span>
                  {skill.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p
        aria-live="polite"
        className="mt-4 flex min-h-10 flex-col items-center justify-center gap-1 text-center text-sm text-fg-muted"
      >
        {active ? (
          <span>
            <span className="font-medium text-fg">{active.name}</span>
            <span aria-hidden="true" className="px-2 text-fg-subtle">
              ·
            </span>
            <span className="text-accent">{SKILL_CATEGORY_LABELS[active.category]}</span>
            {active.description ? (
              <>
                <span aria-hidden="true" className="px-2 text-fg-subtle">
                  ·
                </span>
                {active.description}
              </>
            ) : null}
          </span>
        ) : (
          <span className="text-fg-subtle">Select a technology to inspect it.</span>
        )}
      </p>
    </div>
  );
}
