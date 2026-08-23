"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { SectionTone } from "@/lib/constants/section-tone";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { TASKBAR_HEIGHT_CLASS, itemForSection } from "./desktop-config";
import { StartMenu } from "./start-menu";
import { TaskbarClock } from "./taskbar-clock";
import { useScrolledAway } from "./use-hide-on-scroll";

/**
 * The bar along the top.
 *
 * Reads left to right the way a taskbar does: start button, the task that is
 * currently in focus, then the tray. The section the visitor is reading stands
 * in for the focused window — it is the only "running app" this machine has.
 * Every control it has ever had is still here; only the edge it is docked to
 * and its willingness to step aside have changed.
 *
 * It hides on the way down and comes back on the way up, which is the one
 * behaviour that makes a top bar affordable: a section is a screen tall, and a
 * bar that never moved would eat the top of every one of them. Three things
 * override the hiding, and each is a case where a disappearing bar would be a
 * bug rather than a courtesy:
 *
 *   - the start menu is open — the panel hangs off the bar, so hiding the bar
 *     would fly an anchored popover off the top of the screen;
 *   - focus is inside it — a keyboard visitor who tabbed into the bar must be
 *     able to see what they are on, and this is also what brings the bar back
 *     for them, since focus lands before the reveal;
 *   - reduced motion — there is no slide to watch, so a bar that blinked in and
 *     out would just be flicker.
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
  const scrolledAway = useScrolledAway();
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  const current = itemForSection(activeSection);
  const Icon = current.icon;

  const hidden = scrolledAway && !menuOpen && !focusWithin && !reducedMotion;

  return (
    <motion.div
      // `data-no-ripple`: the click droplet belongs to the page, not the chrome.
      data-no-ripple
      // Capture phase, so focus moving into a control several levels down still
      // pins the bar — `focus` does not bubble, `focusin` semantics do.
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={() => setFocusWithin(false)}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: reducedMotion ? 0 : DURATION.fast, ease: EASE_OUT }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-border/70",
        "bg-surface/80 backdrop-blur-xl",
        TASKBAR_HEIGHT_CLASS,
      )}
    >
      <div className="flex h-full items-center gap-2 px-2 sm:gap-3 sm:px-3">
        <StartMenu
          name={name}
          activeSection={activeSection}
          tone={tone}
          onOpenChange={setMenuOpen}
        />

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
    </motion.div>
  );
}
