"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { GameModeToggle } from "@/components/game/game-mode-toggle";
import { SceneryPicker } from "@/components/layout/scenery-picker";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { NAV_ITEMS } from "@/lib/constants/navigation";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * Small-screen navigation.
 *
 * Accessibility notes, since a hand-rolled drawer gets these wrong by default:
 *  - the trigger owns `aria-expanded` and `aria-controls`
 *  - the panel is `role="dialog" aria-modal="true"` with a label
 *  - Escape closes it and focus returns to the trigger
 *  - focus is trapped inside the panel while it is open
 *  - background scrolling is locked so the page behind cannot move
 */

interface MobileMenuProps {
  activeSection: string | null;
  /** The `three-scenery` admin flag — off omits the row entirely (S12). */
  sceneryEnabled: boolean;
  className?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileMenu({ activeSection, sceneryEnabled, className }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useMotionPreference();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      // Wrap focus at both ends so Tab can never escape into the inert page.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    // Move focus into the panel once it exists in the DOM.
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const transition = { duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT };

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full border border-border",
          "bg-surface text-fg transition-colors duration-200 hover:bg-surface-hover",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        {open ? (
          <X className="size-4.5" aria-hidden="true" />
        ) : (
          <Menu className="size-4.5" aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
              aria-hidden="true"
            />

            <motion.div
              key="panel"
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              initial={{ opacity: 0, y: reducedMotion ? 0 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -12 }}
              transition={transition}
              className={cn(
                "fixed inset-x-3 top-3 z-50 overflow-hidden rounded-card border border-border",
                "bg-surface-raised p-2 shadow-floating",
              )}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="label-mono">Navigation</span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="inline-flex size-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <X className="size-4.5" aria-hidden="true" />
                </button>
              </div>

              <nav aria-label="Mobile">
                <ul className="flex flex-col">
                  {NAV_ITEMS.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        ...transition,
                        delay: reducedMotion ? 0 : 0.04 + index * 0.035,
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={activeSection === item.id ? "true" : undefined}
                        className={cn(
                          "flex items-baseline justify-between rounded-lg px-3 py-3 text-lg font-medium",
                          "transition-colors duration-150 hover:bg-surface-hover",
                          activeSection === item.id ? "text-accent" : "text-fg",
                        )}
                      >
                        {item.label}
                        <span className="label-mono" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <div className="mt-2 flex items-center justify-between border-t border-border px-3 pt-3 pb-1">
                <span className="label-mono">Theme</span>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <span className="label-mono">Mode</span>
                <GameModeToggle />
              </div>

              {sceneryEnabled ? (
                <div className="flex items-center justify-between px-3 pt-3 pb-1">
                  <span className="label-mono">Scenery</span>
                  <SceneryPicker />
                </div>
              ) : null}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
