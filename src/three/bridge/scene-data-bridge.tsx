"use client";

import { useEffect } from "react";

import { useSceneContentStore } from "@/lib/store/scene-content-store";
import type { Experience, Project, Skill } from "@/lib/types/content";

/**
 * Zero-render data hand-off from a server-rendered section to the persistent
 * 3D scene. Each component below renders nothing; it exists only to push its
 * parent section's already-fetched props into `scene-content-store` once
 * mounted, so `src/three/sections/*` can read real content without owning a
 * fetch of its own.
 */

export function SkillsSceneBridge({ skills }: { skills: Skill[] }) {
  const setSkills = useSceneContentStore((state) => state.setSkills);
  useEffect(() => setSkills(skills), [skills, setSkills]);
  return null;
}

export function ExperienceSceneBridge({ experiences }: { experiences: Experience[] }) {
  const setExperiences = useSceneContentStore((state) => state.setExperiences);
  useEffect(() => setExperiences(experiences), [experiences, setExperiences]);
  return null;
}

export function ProjectsSceneBridge({ projects }: { projects: Project[] }) {
  const setProjects = useSceneContentStore((state) => state.setProjects);
  useEffect(() => setProjects(projects), [projects, setProjects]);
  return null;
}
