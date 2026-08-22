"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { Magnetic } from "@/components/experience/magnetic";
import { cn } from "@/lib/utils/cn";

import type { DesktopItem } from "./desktop-config";
import { scrollToSection } from "./use-section-paging";

/**
 * One shortcut on the desktop.
 *
 * A real desktop wants a double-click. This one opens on a single click,
 * because a link that ignores the first click is a broken link — the metaphor
 * stops where it would cost the visitor something.
 *
 * Underneath it is a plain `<Link href="/#about">`, so middle-click, ⌘-click and
 * "copy link address" all behave. The click handler only takes over the plain
 * left-click, and only when the target section is actually on this page.
 */

interface DesktopIconProps {
  item: DesktopItem;
  active: boolean;
  /** Called after a successful activation — the start menu uses it to close. */
  onNavigate?: () => void;
  className?: string;
}

export function DesktopIcon({ item, active, onNavigate, className }: DesktopIconProps) {
  const Icon = item.icon;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Leave every modified click to the browser: these are real links.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    if (scrollToSection(item.id)) event.preventDefault();
    onNavigate?.();
  }

  return (
    // The dock is the site's navigation, so the shortcuts carry the whole
    // interaction vocabulary: they lean toward the pointer, tilt as they lean,
    // and swell the cursor into its button state.
    <Magnetic strength={0.22} tilt={12}>
      <Link
        href={item.href}
        onClick={handleClick}
        aria-current={active ? "true" : undefined}
        data-cursor="button"
        data-magnetic
        className={cn(
          "group flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-1.5",
          "transition-colors duration-200 hover:bg-surface/70",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          className,
        )}
      >
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-xl border",
            "transition-[background-color,border-color,color,transform] duration-200",
            "motion-safe:group-hover:-translate-y-0.5 motion-safe:group-active:translate-y-0",
            active
              ? "border-accent/50 bg-accent/15 text-accent shadow-sm"
              : "border-border/70 bg-surface/70 text-fg-muted group-hover:border-border-strong group-hover:text-fg",
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" strokeWidth={1.75} />
        </span>

        <span
          className={cn(
            "max-w-full truncate text-[10px] leading-tight font-medium transition-colors duration-200",
            active ? "text-fg" : "text-fg-muted group-hover:text-fg",
          )}
        >
          {item.label}
        </span>
      </Link>
    </Magnetic>
  );
}
