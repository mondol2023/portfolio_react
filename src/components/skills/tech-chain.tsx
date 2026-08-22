"use client";

import { useState } from "react";

import { TechMarquee } from "@/components/skills/tech-marquee";
import {
  PROFICIENCY_LABELS,
  SKILL_CATEGORY_LABELS,
  type Skill,
} from "@/lib/types/content";

/**
 * The whole stack as one chain, dealt across three or four scrolling lines.
 *
 * Categories are not what the eye sees any more — the chain is unbroken and
 * mixed — but they are still how a skill is entered in the admin panel, and
 * they are what the caption names when a pill is selected. So the notion
 * survives as information rather than as a heading over every row.
 *
 * Items are dealt round-robin rather than sliced into blocks, which keeps
 * categories mixed down the rows and keeps the row lengths within one item of
 * each other — and equal-length rows matter, because row duration is derived
 * from item count.
 */

/** Roughly how many pills should land on a line before another one is opened. */
const ITEMS_PER_ROW = 7;
const MIN_ROWS = 3;
const MAX_ROWS = 4;

function toRows(skills: readonly Skill[]): Skill[][] {
  const wanted = Math.ceil(skills.length / ITEMS_PER_ROW);
  const count = Math.min(MAX_ROWS, Math.max(MIN_ROWS, wanted));

  const rows = Array.from({ length: count }, (_, row) =>
    skills.filter((_, index) => index % count === row),
  );

  // A stack smaller than the row count would otherwise render empty lines.
  return rows.filter((row) => row.length > 0);
}

export function TechChain({ skills }: { skills: Skill[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const rows = toRows(skills);
  const active = skills.find((skill) => skill.id === activeId) ?? null;

  // A second click on the same pill puts it back — the zoom is a toggle, not a
  // trap, and there is nowhere else to click that would obviously dismiss it.
  const select = (id: string) => {
    setActiveId((current) => (current === id ? null : id));
  };

  return (
    <div>
      <div className="-mx-5 flex flex-col gap-1 md:-mx-8 xl:-mx-10">
        {rows.map((row, index) => (
          <TechMarquee
            key={index}
            skills={row}
            direction={index % 2 === 0 ? "forward" : "reverse"}
            label={`Technologies, line ${index + 1} of ${rows.length}`}
            activeId={activeId}
            onSelect={select}
          />
        ))}
      </div>

      {/*
       * The caption is the only part that moves when a pill is selected, and it
       * is outside the marquees on purpose: text inside a row would have to
       * change a pill's width, which is exactly what the seamless loop cannot
       * survive. `min-h` reserves both lines so nothing below it shifts.
       */}
      <p
        aria-live="polite"
        className="mt-6 flex min-h-12 flex-col items-center justify-center gap-1 text-center text-sm text-fg-muted sm:min-h-10"
      >
        {active ? (
          <>
            <span>
              <span className="font-medium text-fg">{active.name}</span>
              <span aria-hidden="true" className="px-2 text-fg-subtle">
                ·
              </span>
              <span className="text-tone">{SKILL_CATEGORY_LABELS[active.category]}</span>
              {active.proficiency ? (
                <>
                  <span aria-hidden="true" className="px-2 text-fg-subtle">
                    ·
                  </span>
                  {PROFICIENCY_LABELS[active.proficiency]}
                </>
              ) : null}
            </span>
            {active.description ? <span>{active.description}</span> : null}
          </>
        ) : (
          <span className="text-fg-subtle">
            Select a technology to see where it sits in the stack.
          </span>
        )}
      </p>
    </div>
  );
}
