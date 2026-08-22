"use client";

import { useEffect } from "react";

import { useQuest } from "@/lib/game/quest/use-quest";

/**
 * Records that a case study was opened.
 *
 * Mounted by the detail page rather than handled on the card, because
 * [project-card.tsx](../projects/project-card.tsx) is a server component using
 * the stretched-link pattern: giving it a click handler would turn the whole
 * card into a client component, and the handler would still be racing the
 * navigation it triggers. Arriving on the page is the more truthful signal
 * anyway — a click that never landed is not a project the visitor read.
 *
 * Renders nothing. `openProject` is idempotent per id, so a back-and-forward
 * through the same case study pays once.
 */
export function QuestVisit({ projectId }: { projectId: string }) {
  const { openProject } = useQuest();

  useEffect(() => {
    openProject(projectId);
  }, [openProject, projectId]);

  return null;
}
