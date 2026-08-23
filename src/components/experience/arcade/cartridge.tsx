"use client";

import { motion } from "motion/react";
import { Play } from "lucide-react";
import { useEffect, useRef } from "react";

import { Magnetic } from "@/components/experience/magnetic";
import { TiltCard, TiltLayer } from "@/components/experience/tilt-card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { TechTile } from "@/components/ui/tech-tile";
import { spring } from "@/lib/experience/springs";
import type { Project } from "@/lib/types/content";
import { PROJECT_STATUS_LABELS, projectStatus, type ProjectStatus } from "@/lib/utils/project-status";
import { lookupTechIcon, type TechIconMap } from "@/lib/utils/tech-icons";

/**
 * One cartridge in the arcade grid: name, tech stack, description and
 * status, styled like a game cartridge label. Carries the `layoutId` that
 * `ExpandedCartridge` picks up on select, so growing one into the full view
 * reads as a morph rather than a swap.
 */

const VISIBLE_TECH = 5;

const STATUS_BADGE: Record<ProjectStatus, BadgeVariant> = {
  live: "success",
  "in-progress": "warning",
  shipped: "outline",
};

interface CartridgeProps {
  project: Project;
  techIcons: TechIconMap;
  /** True while a different cartridge is selected — fades this one back. */
  dimmed: boolean;
  /**
   * True for the cartridge that was just collapsed back out of the overlay.
   * Selecting one unmounts it, so the trigger a focus trap would normally
   * hand focus back to no longer exists by the time the overlay closes — the
   * restored cartridge has to claim it on the way back in instead.
   */
  restoreFocus: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}

export function Cartridge({ project, techIcons, dimmed, restoreFocus, onHover, onSelect }: CartridgeProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const status = projectStatus(project);
  const shownTech = project.technologies.slice(0, VISIBLE_TECH);
  const hiddenTech = project.technologies.length - shownTech.length;

  useEffect(() => {
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  }, [restoreFocus]);

  return (
    <motion.div
      layoutId={`cartridge-${project.id}`}
      animate={{ opacity: dimmed ? 0.25 : 1, scale: dimmed ? 0.94 : 1 }}
      // The grid reflow when a sibling is pulled out is the "others move away"
      // beat, so it gets the panel spring rather than the flat tween the
      // dim-back uses.
      transition={{ layout: spring("panel"), default: { duration: 0.3 } }}
      style={{ pointerEvents: dimmed ? "none" : "auto", height: "100%" }}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
    >
      <TiltCard max={8} glare className="h-full">
        <button
          ref={buttonRef}
          type="button"
          onClick={onSelect}
          aria-haspopup="dialog"
          aria-label={`Expand ${project.title}`}
          className="group flex h-full w-full flex-col rounded-card border border-border bg-surface p-6 text-left transition-colors hover:border-tone"
        >
          <TiltLayer depth={18} className="flex items-start justify-between gap-3">
            <p className="label-mono text-tone">{project.type}</p>
            <Badge variant={STATUS_BADGE[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
          </TiltLayer>

          <TiltLayer depth={28} className="mt-4">
            <h3 className="text-xl font-semibold tracking-tight text-fg">{project.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">
              {project.shortDescription}
            </p>
          </TiltLayer>

          {shownTech.length > 0 ? (
            <TiltLayer depth={14} className="mt-5 flex flex-wrap items-center gap-2">
              {shownTech.map((tech) => (
                <TechTile key={tech} name={tech} iconUrl={lookupTechIcon(techIcons, tech)} size="sm" />
              ))}
              {hiddenTech > 0 ? (
                <span className="label-mono text-fg-subtle">+{hiddenTech}</span>
              ) : null}
            </TiltLayer>
          ) : null}

          <TiltLayer depth={24} className="mt-auto pt-6">
            <Magnetic strength={0.24} className="inline-block">
              <span className="label-mono inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-fg-muted transition-colors group-hover:border-tone group-hover:text-tone">
                <Play aria-hidden="true" className="size-3.5" />
                Play project
              </span>
            </Magnetic>
          </TiltLayer>
        </button>
      </TiltCard>
    </motion.div>
  );
}
