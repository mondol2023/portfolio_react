import type { Project } from "@/lib/types/content";

/**
 * `Project` has no `status` field — it's derived from the fields that already
 * carry the same information: a live URL means it's live, an open-ended end
 * date means it's still being worked on, and otherwise it shipped and closed.
 */

export type ProjectStatus = "live" | "in-progress" | "shipped";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  live: "Live",
  "in-progress": "In progress",
  shipped: "Shipped",
};

export function projectStatus(project: Pick<Project, "liveUrl" | "endDate">): ProjectStatus {
  if (project.liveUrl) return "live";
  if (!project.endDate) return "in-progress";
  return "shipped";
}
