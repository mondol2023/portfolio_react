"use client";

import { useEffect } from "react";

import { gameStore } from "@/lib/store/game-store";

/**
 * Marks one project as "viewed" for the Project Hunter achievement.
 *
 * Case studies are full page navigations, not a modal `TechChain` can toggle
 * client-side, so the project detail page (a server component) mounts this
 * one-line client leaf instead of tracking the open client-side itself.
 */
export function ProjectViewTracker({ projectId }: { projectId: string }) {
  useEffect(() => {
    gameStore.viewProject(projectId);
  }, [projectId]);

  return null;
}
