"use client";

import { useRef, useState } from "react";

import { ScrollProgressLine } from "@/components/motion/scroll-progress-line";
import { useScrollVelocity } from "@/lib/experience/use-scroll-velocity";
import type { Experience as ExperienceEntry } from "@/lib/types/content";
import type { TechIconMap } from "@/lib/utils/tech-icons";

import { RoleScene } from "./role-scene";
import { TimelineCanvas } from "./timeline-canvas";
import { TimelineEntry } from "./timeline-entry";
import { useActiveEra } from "./use-active-era";

/**
 * Client mount for the Experience section: the 3D tunnel background, the
 * centre rail, the list of role cards, and the expanded-role modal. Kept
 * separate from `sections/experience.tsx` so that server component stays the
 * one deciding what to render when there's no data, while this owns all the
 * interactive state (active era, expanded role, scroll velocity).
 */

interface TimelineProps {
  experiences: ExperienceEntry[];
  techIcons: TechIconMap;
}

export function Timeline({ experiences, techIcons }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex, entered, registerEra } = useActiveEra(experiences.length);
  const velocity = useScrollVelocity(containerRef);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const expandedEntry = expandedIndex !== null ? (experiences[expandedIndex] ?? null) : null;

  return (
    <div ref={containerRef} className="relative">
      <TimelineCanvas eraIndex={activeIndex} eraCount={experiences.length} velocity={velocity} />

      {/*
        The rail has to track the row markers, which sit at the far left on a
        single-column layout and only move to the centre once the cards split
        into two columns.
      */}
      <ScrollProgressLine railClassName="left-4 -translate-x-1/2 md:left-1/2" className="mt-16">
        <ol className="space-y-16">
          {experiences.map((entry, index) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              index={index}
              align={index % 2 === 0 ? "left" : "right"}
              isActive={entered && index === activeIndex}
              techIcons={techIcons}
              registerRef={registerEra(index)}
              onExpand={() => setExpandedIndex(index)}
            />
          ))}
        </ol>
      </ScrollProgressLine>

      <RoleScene
        entry={expandedEntry}
        open={expandedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setExpandedIndex(null);
        }}
        techIcons={techIcons}
      />
    </div>
  );
}
