"use client";

import { useEffect } from "react";

import { SECTION_IDS } from "@/lib/constants/navigation";
import { useQuest } from "@/lib/game/quest/use-quest";
import { useActiveSection } from "@/lib/hooks/use-active-section";

import { toneForSection } from "./desktop-config";
import { IconDock } from "./icon-dock";
import { Taskbar } from "./taskbar";
import { useSectionPaging } from "./use-section-paging";
import { WallpaperField } from "./wallpaper-field";

/**
 * The machine the visitor is sitting at: wallpaper, shortcuts, taskbar.
 *
 * Replaces `SiteHeader` as the public shell's chrome. It is the single place the
 * scroll position is read, and everything downstream is a prop:
 *
 *   useActiveSection  →  tone      →  which wallpaper is showing
 *                     →  activeSection → which shortcut is lit, which task the
 *                                        taskbar says is in focus
 *                     →  visitSection  → the quest layer
 *
 * That one-observer rule is load-bearing. `useActiveSection` builds an
 * `IntersectionObserver` per *call site*, so having the wallpaper run its own
 * copy would double the observers watching the same six elements for the same
 * answer. There are exactly two on the page — this one and the ambient
 * background's — and a third should have to justify itself.
 */

export function DesktopChrome({ name }: { name: string }) {
  const activeSection = useActiveSection(SECTION_IDS);
  const { visitSection } = useQuest();

  // The quest rides along with the scroll-spy above rather than adding a second
  // observer. `visitSection` is idempotent — repeat calls for a section already
  // recorded return the same state object and React bails out of the re-render.
  useEffect(() => {
    if (activeSection) visitSection(activeSection);
  }, [activeSection, visitSection]);

  useSectionPaging();

  const tone = toneForSection(activeSection);

  return (
    <>
      <WallpaperField tone={tone} />
      <IconDock activeSection={activeSection} />
      <Taskbar name={name} activeSection={activeSection} tone={tone} />
    </>
  );
}
