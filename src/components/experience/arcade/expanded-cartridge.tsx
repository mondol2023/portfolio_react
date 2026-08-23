"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Code2, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { TechChip } from "@/components/ui/tech-chip";
import { spring } from "@/lib/experience/springs";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import type { Project } from "@/lib/types/content";
import { PROJECT_STATUS_LABELS, projectStatus, type ProjectStatus } from "@/lib/utils/project-status";
import { lookupTechIcon, type TechIconMap } from "@/lib/utils/tech-icons";

import { BrowserPreview } from "./browser-preview";

/**
 * The cartridge a click grows into: browser preview, full description, tech
 * stack and links. Shares its `layoutId` with the `Cartridge` it replaces so
 * Motion morphs one into the other. Uses the focus-trap hook rather than
 * `<dialog>` — the layout animation needs a plain positioned element to
 * morph, not one promoted to the top layer.
 *
 * Rendered through a portal into `<body>`, and that is not optional: every
 * section is wrapped in `ScrollVeil`, which animates `opacity` and `y`. A
 * transformed ancestor becomes the containing block for `position: fixed`
 * descendants, so left in place this overlay would be pinned to the section's
 * content box and scroll away with it instead of covering the viewport. The
 * portal also lifts it out of the veil's stacking context, where its `z-50`
 * would only have ranked it against its own siblings. `RoleScene` needs none
 * of this because `<dialog>.showModal()` escapes to the top layer for free.
 */

const STATUS_BADGE: Record<ProjectStatus, "success" | "warning" | "outline"> = {
  live: "success",
  "in-progress": "warning",
  shipped: "outline",
};

const LINK_CLASS =
  "label-mono inline-flex items-center gap-1.5 rounded-full border border-border-strong px-4 py-2 text-fg-muted transition-colors hover:border-tone hover:text-tone";

interface ExpandedCartridgeProps {
  project: Project;
  techIcons: TechIconMap;
  onClose: () => void;
}

export function ExpandedCartridge({ project, techIcons, onClose }: ExpandedCartridgeProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const status = projectStatus(project);

  useFocusTrap(panelRef, true, onClose);

  // Only ever reached from a click, so `document` always exists by now; the
  // guard is for the render path a future server-side caller could open.
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <motion.div
        key="scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        key="panel"
        layoutId={`cartridge-${project.id}`}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        exit={{ opacity: 0 }}
        // The shared-element morph gets the panel spring; the exit fade is a
        // short cut, so a closing panel does not linger over the card growing
        // back underneath it.
        transition={{ layout: spring("panel"), opacity: { duration: 0.18 } }}
        className="fixed inset-4 z-50 flex flex-col overflow-y-auto rounded-card border border-border bg-surface-raised p-6 shadow-floating sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-mono text-tone">{project.type}</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{project.title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_BADGE[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-4.5" />
            </button>
          </div>
        </div>

        <BrowserPreview project={project} techIcons={techIcons} className="mt-6" />

        <p className="mt-6 text-sm leading-relaxed text-fg-muted">{project.fullDescription}</p>

        {project.technologies.length > 0 ? (
          <ul aria-label={`Technologies used in ${project.title}`} className="mt-6 flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <li key={tech}>
                <TechChip name={tech} iconUrl={lookupTechIcon(techIcons, tech)} />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Link href={`/projects/${project.slug}`} className={LINK_CLASS}>
            Case study
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
          {project.liveUrl ? (
            <a href={project.liveUrl} target="_blank" rel="noreferrer" className={LINK_CLASS}>
              Live site
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          ) : null}
          {project.githubUrl ? (
            <a href={project.githubUrl} target="_blank" rel="noreferrer" className={LINK_CLASS}>
              <Code2 aria-hidden="true" className="size-3.5" />
              Source
            </a>
          ) : null}
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
