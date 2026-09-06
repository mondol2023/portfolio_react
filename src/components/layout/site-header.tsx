"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { GameModeToggle } from "@/components/game/game-mode-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NAV_ITEMS, SECTION_IDS } from "@/lib/constants/navigation";
import { useActiveSection } from "@/lib/hooks/use-active-section";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { useScrollDirection } from "@/lib/hooks/use-scroll-direction";
import { cn } from "@/lib/utils/cn";

/**
 * Fixed navigation bar.
 *
 * Hides while scrolling down and returns on the first upward scroll, and is
 * always visible near the top of the document. The jitter guards live in
 * `useScrollDirection`, so this component only decides what to render.
 *
 * There is no admin link here, and there never should be: the admin panel is
 * reachable only by typing `/admin`, and is enforced server-side regardless.
 */

interface SiteHeaderProps {
  /** Site owner's name — doubles as the wordmark. */
  name: string;
}

export function SiteHeader({ name }: SiteHeaderProps) {
  const { direction, isAtTop } = useScrollDirection();
  const activeSection = useActiveSection(SECTION_IDS);
  const reducedMotion = useMotionPreference();

  const hidden = direction === "down" && !isAtTop;

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden && !reducedMotion ? "-110%" : "0%" }}
      transition={{ duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT }}
      className="fixed inset-x-0 top-0 z-50 pt-3 sm:pt-4"
      // Hidden from assistive tech only visually — it is still in the tab order,
      // and any focus inside it scrolls the page, which reveals it again.
    >
      <div className="container-page">
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-full border px-3 py-2 transition-[background-color,border-color,box-shadow] duration-300 sm:px-4",
            isAtTop
              ? "border-transparent bg-transparent"
              : "border-border bg-surface/80 shadow-sm backdrop-blur-xl",
          )}
        >
          <Link
            href="/#home"
            className="rounded-full px-2 py-1 text-sm font-semibold tracking-tight text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {name}
            <span className="text-accent">.</span>
          </Link>

          {/* Everything that is not the wordmark sits together on the right, so
              the bar reads as name on one end and controls on the other. */}
          <div className="flex items-center gap-2">
            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "relative inline-flex items-center rounded-full px-3 py-1.5 text-sm transition-colors duration-200",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                          isActive ? "text-fg" : "text-fg-muted hover:text-fg",
                        )}
                      >
                        {isActive ? (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 -z-10 rounded-full bg-surface-hover"
                            transition={{
                              duration: reducedMotion ? 0.01 : DURATION.fast,
                              ease: EASE_OUT,
                            }}
                          />
                        ) : null}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Separated from the links: a control, not a destination. */}
            <GameModeToggle className="ml-1 hidden md:inline-flex" />
            <ThemeToggle className="ml-1 hidden md:inline-flex" />
            <MobileMenu activeSection={activeSection} className="md:hidden" />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
