"use client";

import { motion } from "motion/react";
import { MousePointer2 } from "lucide-react";

import { TechTile } from "@/components/ui/tech-tile";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import type { Project } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";
import { lookupTechIcon, type TechIconMap } from "@/lib/utils/tech-icons";

/**
 * A fake browser window standing in for a screenshot: traffic lights, an
 * address bar, a loading bar that sweeps on mount, tech badges that float in
 * place, and a cursor that wanders the frame. Always animated, never a
 * static image — a project with no `liveUrl` gets the same chrome around
 * its slug instead.
 */

/** Seconds the loading bar takes before the "page" is treated as painted. */
const LOAD_DURATION = 1.4;

/**
 * Waypoints for the wandering cursor, as fractions of the frame.
 *
 * Applied to a full-size layer via `x`/`y` rather than to the icon via
 * `left`/`top`: a percentage transform resolves against the animated element's
 * own box, so a layer that fills the frame turns "70%" into "70% of the
 * preview" while staying on the compositor. Animating `left`/`top` instead
 * would relayout the frame on every one of the ~480 frames this loop runs.
 */
const CURSOR_PATH = {
  x: ["20%", "70%", "55%", "30%", "20%"],
  y: ["30%", "20%", "65%", "50%", "30%"],
};

interface BrowserPreviewProps {
  project: Project;
  techIcons: TechIconMap;
  className?: string;
}

export function BrowserPreview({ project, techIcons, className }: BrowserPreviewProps) {
  const reducedMotion = useMotionPreference();
  const address = project.liveUrl
    ? project.liveUrl.replace(/^https?:\/\//, "")
    : `localhost/${project.slug}`;
  const floatingTech = project.technologies.slice(0, 4);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-bg-subtle", className)}>
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <div className="flex gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-danger" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-warning" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-success" />
        </div>
        <div className="flex-1 truncate rounded-full bg-bg-subtle px-3 py-1 font-mono text-xs text-fg-subtle">
          {address}
        </div>
      </div>

      <div className="surface-grid relative aspect-video overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 origin-left bg-tone"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={reducedMotion ? { scaleX: 1, opacity: 0 } : { scaleX: 1, opacity: [1, 1, 0] }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  scaleX: { duration: LOAD_DURATION, ease: "easeOut" },
                  opacity: { duration: LOAD_DURATION + 0.3, times: [0, 0.82, 1] },
                }
          }
        />

        {/*
          The badges land only once the bar has finished, which is the whole
          point of simulating a load: something has to be waiting on it, or the
          bar is just a decorative stripe over content that was already there.
        */}
        {floatingTech.map((tech, index) => {
          const appear = LOAD_DURATION * 0.7 + index * 0.12;

          return (
            <motion.div
              key={tech}
              className="absolute"
              style={{ left: `${15 + index * 20}%`, top: `${20 + (index % 2) * 40}%` }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : {
                      opacity: { duration: 0.35, delay: appear },
                      scale: { duration: 0.35, delay: appear },
                      y: { duration: 3 + index * 0.4, repeat: Infinity, ease: "easeInOut", delay: appear },
                    }
              }
            >
              <TechTile name={tech} iconUrl={lookupTechIcon(techIcons, tech)} size="md" />
            </motion.div>
          );
        })}

        {!reducedMotion ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
            animate={{ x: CURSOR_PATH.x, y: CURSOR_PATH.y }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: LOAD_DURATION }}
          >
            <MousePointer2 className="size-4 fill-fg text-fg drop-shadow" />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
