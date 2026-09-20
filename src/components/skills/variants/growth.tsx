"use client";

import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { clearHoveredSkill, publishHoveredSkill } from "@/lib/store/scene-interaction-store";
import { SKILL_CATEGORIES, SKILL_CATEGORY_LABELS, type Skill } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";

/**
 * Garden's Skills DOM variant (§4.3, Phase J) — a static, category-grouped
 * list where each pill sprouts in once via `Reveal` and then sits still: no
 * continuous motion in the DOM layer, matching the canvas's own "scroll is
 * the only story parameter" rule. Hover still publishes into
 * `scene-interaction-store.ts` (`SchematicList`'s convention) so `growth.tsx`
 * (the WebGL variant) lights up the same bud this list highlights.
 */
export function GrowthList({ skills }: { skills: Skill[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = SKILL_CATEGORIES.map((category) => ({
    category,
    items: skills.filter((skill) => skill.category === category).sort((a, b) => a.order - b.order),
  })).filter((group) => group.items.length > 0);

  const active = activeId ? skills.find((skill) => skill.id === activeId) ?? null : null;

  return (
    <div>
      {grouped.map((group, groupIndex) => (
        <Reveal key={group.category} as="div" direction="up" delay={groupIndex * 0.06} distance={16} className="mb-7">
          <p className="mb-2.5 text-xs tracking-widest text-fg-subtle uppercase">
            {SKILL_CATEGORY_LABELS[group.category]}
          </p>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((skill, itemIndex) => (
              <li key={skill.id}>
                <Reveal as="span" direction="up" delay={groupIndex * 0.06 + itemIndex * 0.03} distance={10} className="block">
                  <button
                    type="button"
                    onPointerEnter={() => publishHoveredSkill(skill.id)}
                    onPointerLeave={() => clearHoveredSkill(skill.id)}
                    onClick={() => setActiveId((id) => (id === skill.id ? null : skill.id))}
                    className={cn(
                      "rounded-full border border-border-strong px-3.5 py-1.5 text-sm text-fg-muted transition-colors duration-150",
                      "hover:border-accent hover:text-fg",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      activeId === skill.id && "border-accent text-accent",
                    )}
                  >
                    {skill.name}
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
        </Reveal>
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
