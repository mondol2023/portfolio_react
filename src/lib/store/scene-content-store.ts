import { create } from "zustand";

import type { Experience, Project, Skill } from "@/lib/types/content";

/**
 * Bridges real, server-fetched content into the persistent 3D scene.
 *
 * The scene root is mounted once in `(site)/layout.tsx` and has no access to
 * any page's server-fetched props. Each section that owns real data
 * (`Skills`, `Experience`, `Projects`) renders a tiny client "bridge"
 * component (`src/three/bridge/scene-data-bridge.tsx`) that pushes its
 * already-fetched props in here on mount; the corresponding 3D section scene
 * reads it back out with a selector. No network request, no duplicate fetch —
 * just handing data across a component-tree boundary the layout can't cross.
 */
interface SceneContentState {
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
  setSkills(skills: Skill[]): void;
  setExperiences(experiences: Experience[]): void;
  setProjects(projects: Project[]): void;
}

export const useSceneContentStore = create<SceneContentState>()((set) => ({
  skills: [],
  experiences: [],
  projects: [],
  setSkills: (skills) => set({ skills }),
  setExperiences: (experiences) => set({ experiences }),
  setProjects: (projects) => set({ projects }),
}));
