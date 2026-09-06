"use client";

import type { ReactNode } from "react";

import { gameStore } from "@/lib/store/game-store";

/**
 * The Hero's primary CTA, unchanged in every way except one: clicking it also
 * marks "home" discovered immediately, instead of only ever finding out via
 * the scroll-spy once the visitor scrolls elsewhere.
 *
 * Not gated on Game Mode — discovery, XP, and achievements already accrue
 * quietly in Normal Mode too (see `GameProgressTracker`); Game Mode only
 * decides whether the HUD renders that progress. `discoverSection` is
 * idempotent, so this is a no-op the second time "home" is already marked.
 */
export function StartAdventureLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className} onClick={() => gameStore.discoverSection("home")}>
      {children}
    </a>
  );
}
