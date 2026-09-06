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

/**
 * A "mission scope" badge for the gamified framing — deliberately about the
 * *size of the stack*, not a claim about how hard the project was. Difficulty
 * is not something a tech count can honestly measure; how many technologies
 * it touched is.
 */
export type MissionScope = "focused" | "standard" | "extensive";

export const MISSION_SCOPE_LABELS: Record<MissionScope, string> = {
  focused: "Focused mission",
  standard: "Standard mission",
  extensive: "Extensive mission",
};

const EXTENSIVE_TECH_COUNT = 7;
const STANDARD_TECH_COUNT = 4;

export function missionScope(project: Pick<Project, "technologies">): MissionScope {
  const count = project.technologies.length;
  if (count >= EXTENSIVE_TECH_COUNT) return "extensive";
  if (count >= STANDARD_TECH_COUNT) return "standard";
  return "focused";
}
