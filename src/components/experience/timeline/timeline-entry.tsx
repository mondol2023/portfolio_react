"use client";

import { Maximize2 } from "lucide-react";
import type { RefCallback } from "react";

import { Magnetic } from "@/components/experience/magnetic";
import { ScrambleText } from "@/components/experience/text/scramble-text";
import { TiltCard, TiltLayer } from "@/components/experience/tilt-card";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { TechChip } from "@/components/ui/tech-chip";
import {
  EMPLOYMENT_TYPE_LABELS,
  type Experience as ExperienceEntry,
} from "@/lib/types/content";
import { formatDateRange, toDateTimeAttribute } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { lookupTechIcon, type TechIconMap } from "@/lib/utils/tech-icons";

/**
 * One role on the timeline: a tilt card that sits to the left or right of the
 * centre rail, alternating by index so the list reads as a zig-zag rather
 * than a single column. Only a summary lives here — the full description and
 * responsibilities are reserved for the modal `RoleScene` opens.
 */

const VISIBLE_TECH = 4;

interface TimelineEntryProps {
  entry: ExperienceEntry;
  index: number;
  align: "left" | "right";
  /**
   * True while this is the era centred in the viewport. Drives the glitch on
   * the era label and dates, so the corruption plays as the reader arrives at
   * each era rather than once, invisibly, at hydration.
   */
  isActive: boolean;
  techIcons: TechIconMap;
  registerRef: RefCallback<HTMLLIElement>;
  onExpand: () => void;
}

export function TimelineEntry({ entry, index, align, isActive, techIcons, registerRef, onExpand }: TimelineEntryProps) {
  const shownTech = entry.technologies.slice(0, VISIBLE_TECH);
  const hiddenTechCount = entry.technologies.length - shownTech.length;

  return (
    <li ref={registerRef} className="relative">
      {/* Node on the centre rail, level with the card's top edge. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-3 left-4 size-3 -translate-x-1/2 rounded-full ring-4 ring-bg-subtle",
          "transition-[background-color,box-shadow,transform] duration-300 md:left-1/2",
          entry.isCurrent || isActive ? "bg-tone" : "bg-border-strong",
          // The node the tunnel's bright ring corresponds to, so the DOM and
          // the canvas are visibly talking about the same era.
          isActive ? "scale-125 shadow-[0_0_0_6px_var(--tone-soft)]" : "scale-100",
        )}
      />

      <div className="pl-10 md:grid md:grid-cols-2 md:gap-x-16 md:pl-0">
        <Reveal
          direction={align === "left" ? "left" : "right"}
          delay={Math.min(index * 0.05, 0.3)}
          className={align === "left" ? "md:col-start-1" : "md:col-start-2"}
        >
          <TiltCard max={6}>
            <div className="rounded-card border border-border bg-surface p-6 transition-colors hover:border-tone">
              <TiltLayer depth={14} className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-mono text-tone">
                    <ScrambleText active={isActive} text={`ERA ${String(index + 1).padStart(2, "0")}`} />
                  </p>
                  <p className="mt-1 font-mono text-xs text-fg-subtle">
                    <time dateTime={toDateTimeAttribute(entry.startDate)}>
                      <ScrambleText
                        active={isActive}
                        delay={0.08}
                        text={formatDateRange(entry.startDate, entry.endDate)}
                        fixedWidth={false}
                      />
                    </time>
                  </p>
                </div>
                {entry.isCurrent ? <Badge variant="success">Current</Badge> : null}
              </TiltLayer>

              <TiltLayer depth={22} className="mt-4">
                <h3 className="text-xl font-semibold tracking-tight text-fg">{entry.position}</h3>
                <p className="mt-1.5 text-sm text-fg-muted">
                  <span className="font-medium text-fg">{entry.company}</span>
                  <span aria-hidden="true"> · </span>
                  {EMPLOYMENT_TYPE_LABELS[entry.employmentType]}
                  {entry.location ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      {entry.location}
                    </>
                  ) : null}
                </p>
              </TiltLayer>

              {shownTech.length > 0 ? (
                <TiltLayer depth={10} className="mt-4 flex flex-wrap gap-2">
                  {shownTech.map((tech) => (
                    <TechChip key={tech} name={tech} iconUrl={lookupTechIcon(techIcons, tech)} />
                  ))}
                  {hiddenTechCount > 0 ? <Badge variant="outline">+{hiddenTechCount}</Badge> : null}
                </TiltLayer>
              ) : null}

              <TiltLayer depth={16} className="mt-5">
                <Magnetic strength={0.24} className="inline-block">
                  <button
                    type="button"
                    onClick={onExpand}
                    className="label-mono inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-fg-muted transition-colors hover:border-tone hover:text-tone"
                  >
                    Expand role
                    <Maximize2 aria-hidden="true" className="size-3.5" />
                  </button>
                </Magnetic>
              </TiltLayer>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </li>
  );
}
