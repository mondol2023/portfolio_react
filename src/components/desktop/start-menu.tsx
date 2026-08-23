"use client";

import { LayoutGrid } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { SectionTone } from "@/lib/constants/section-tone";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { DESKTOP_ITEMS } from "./desktop-config";
import { DesktopIcon } from "./desktop-icon";
import { WALLPAPERS } from "./wallpapers";

/**
 * The start button, and what it opens.
 *
 * This is the whole navigation on a phone — the icon dock is desktop-only — and
 * on a large screen it is the redundant copy every real taskbar also has.
 *
 * A popover, not a dialog: no `aria-modal`, no focus trap, no scroll lock. The
 * page behind stays live and usable, which is what distinguishes a start menu
 * from the drawer this replaces. Escape closes it, a pointer down anywhere
 * outside closes it, and focus goes back to the button either way — those three
 * are the parts a hand-rolled popover usually forgets.
 *
 * `onOpenChange` exists only so the taskbar can pin itself while the panel is
 * up. The panel is anchored to the button, so a bar that slid away on the next
 * scroll would take an open menu off the top of the screen with it.
 */

interface StartMenuProps {
  name: string;
  activeSection: string | null;
  tone: SectionTone;
  onOpenChange?: (open: boolean) => void;
}

export function StartMenu({ name, activeSection, tone, onOpenChange }: StartMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useMotionPreference();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      onOpenChange?.(false);
      triggerRef.current?.focus();
    }

    // `pointerdown` rather than `click`: closing on mouse-down matches every
    // native menu, and it fires before a link inside the page swallows the tap.
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      onOpenChange?.(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    // Focus lands inside once the panel exists, so a keyboard visitor is not
    // left tabbing through the whole page to reach the menu they just opened.
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.clearTimeout(timer);
    };
  }, [open, onOpenChange]);

  // Every path in and out goes through here, so the parent cannot miss one:
  // Escape, an outside pointer down, a click on the trigger and a navigation
  // from inside the panel all close through `setMenu`.
  function setMenu(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  function close() {
    setMenu(false);
    triggerRef.current?.focus();
  }

  const transition = { duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setMenu(true))}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg border px-2 sm:px-2.5",
          "text-sm font-semibold tracking-tight transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          open
            ? "border-accent/50 bg-accent/15 text-fg"
            : "border-transparent text-fg hover:bg-surface-hover",
        )}
      >
        <LayoutGrid className="size-4 shrink-0 text-accent" aria-hidden="true" strokeWidth={2} />
        <span className="max-w-32 truncate sm:max-w-none">
          {name}
          <span className="text-accent">.</span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-label="Start menu"
            initial={{ opacity: 0, y: reducedMotion ? 0 : -8, scale: reducedMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -8, scale: reducedMotion ? 1 : 0.98 }}
            transition={transition}
            // Drops from under the bar rather than rising from above it — the
            // bar is docked to the top now, and a panel growing off-screen
            // upward was the one thing the move actually broke.
            //
            // Anchored to the button on a wide screen; on a phone it spans the
            // viewport instead, because a 280px panel pinned to the left edge of
            // a 320px screen is just a narrower phone.
            className={cn(
              "absolute top-full left-0 mt-2 origin-top-left",
              "w-[min(20rem,calc(100vw-1rem))] rounded-card border border-border",
              "bg-surface-raised/95 p-2 shadow-floating backdrop-blur-xl",
            )}
          >
            <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
              <span className="label-mono">Sections</span>
              {/* The wallpaper has a name, the way wallpapers do. */}
              <span className="truncate pl-3 text-[10px] text-fg-subtle">
                {WALLPAPERS[tone].name}
              </span>
            </div>

            <nav aria-label="Primary">
              <ul className="grid grid-cols-3 gap-0.5">
                {DESKTOP_ITEMS.map((item) => (
                  <li key={item.id} className="flex justify-center">
                    <DesktopIcon
                      item={item}
                      active={activeSection === item.id}
                      onNavigate={() => setMenu(false)}
                      className="w-full"
                    />
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-2 flex items-center justify-between border-t border-border px-2 pt-2.5 pb-1">
              <span className="label-mono">Theme</span>
              <ThemeToggle />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
