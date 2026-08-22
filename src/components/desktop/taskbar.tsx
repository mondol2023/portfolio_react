"use client";

import { AnimatePresence, motion } from "motion/react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { SectionTone } from "@/lib/constants/section-tone";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { TASKBAR_HEIGHT_CLASS, itemForSection } from "./desktop-config";
import { StartMenu } from "./start-menu";
import { TaskbarClock } from "./taskbar-clock";

/**
 * The bar along the bottom.
 *
 * Reads left to right the way a taskbar does: start button, the task that is
 * currently in focus, then the tray. The section the visitor is reading stands
 * in for the focused window — it is the only "running app" this machine has.
 *
 * Unlike the header it replaces, it never hides. A taskbar that slid away on
 * scroll would be a navigation bar wearing a costume, and the whole point of
 * moving navigation to the bottom is that it is always there.
 *
 * There is no admin link here, and there never should be: the admin panel is
 * reachable only by typing `/admin`, and is enforced server-side regardless.
 */

interface TaskbarProps {
  name: string;
  activeSection: string | null;
  tone: SectionTone;
}

export function Taskbar({ name, activeSection, tone }: TaskbarProps) {
  const reducedMotion = useMotionPreference();
  const current = itemForSection(activeSection);
  const Icon = current.icon;

  return (
    <div
      // `data-no-ripple`: the click droplet belongs to the page, not the chrome.
      data-no-ripple
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border/70",
        "bg-surface/80 backdrop-blur-xl",
        TASKBAR_HEIGHT_CLASS,
      )}
    >
      <div className="flex h-full items-center gap-2 px-2 sm:gap-3 sm:px-3">
        <StartMenu name={name} activeSection={activeSection} tone={tone} />

        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />

        {/*
         * The focused "window". Decorative: `aria-current` on the dock and start
         * menu links already tells assistive tech where the visitor is, and a
         * third live region in one bar would narrate every scroll.
         */}
        <div
          aria-hidden="true"
          className={cn(
            "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/60",
            "bg-surface/60 px-2.5 sm:max-w-56",
          )}
        >
          <Icon className="size-4 shrink-0 text-accent" strokeWidth={1.75} />
          <span className="relative h-4 min-w-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={current.id}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
                transition={{ duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT }}
                className="absolute inset-0 truncate text-xs leading-4 font-medium text-fg"
              >
                {current.label}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="label-mono shrink-0 text-[10px] text-fg-subtle">
            {String(current.slot).padStart(2, "0")}
          </span>
        </div>

        {/* The tray. Everything here is a control or a readout, never a link. */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle className="hidden md:inline-flex" />
          <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
          <TaskbarClock />
        </div>
      </div>
    </div>
  );
}
