import { DesktopPanes } from "@/components/desktop/desktop-panes";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Experience } from "@/components/sections/experience";
import { Hero } from "@/components/sections/hero";
import { Projects } from "@/components/sections/projects";
import { Skills } from "@/components/sections/skills";
import { getPublicAbout } from "@/lib/firebase/repositories/about-repository";
import { getPublicExperiences } from "@/lib/firebase/repositories/experience-repository";
import {
  getFeaturedProjects,
  getPublishedProjects,
} from "@/lib/firebase/repositories/projects-repository";
import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";
import { getEnabledSkills } from "@/lib/firebase/repositories/skills-repository";
import { buildTechIconMap } from "@/lib/utils/tech-icons";

/**
 * Home.
 *
 * Composition only: every section owns its own markup and receives exactly the
 * data it needs. The six reads run in parallel and are deduplicated by React
 * `cache()`, so the two project queries here cost one Firestore round trip.
 *
 * The `getPublic*` readers fall back to sample content while a collection is
 * empty, which is why a fresh install renders a complete page. Each section
 * flags that for the reader with a "Sample data" badge.
 */

// Statically rendered and refreshed every five minutes; admin mutations call
// `revalidatePath("/")` so an edit is visible immediately rather than in 300s.
export const revalidate = 300;

export default async function HomePage() {
  const [settings, about, skills, featuredProjects, allProjects, experiences] =
    await Promise.all([
      getSiteSettings(),
      getPublicAbout(),
      getEnabledSkills(),
      getFeaturedProjects(),
      getPublishedProjects(),
      getPublicExperiences(),
    ]);

  // Experience entries name their stack as free text; the icons live on the
  // skills. Matching them here keeps both sections reading from one source.
  const techIcons = buildTechIconMap(skills);

  return (
    // One section per screen: the wrapper gives each child a full viewport and a
    // snap point, so scrolling advances the desktop rather than the document.
    <DesktopPanes>
      <Hero settings={settings} />
      <About about={about} />
      <Skills skills={skills} />
      <Projects projects={featuredProjects} totalCount={allProjects.length} />
      <Experience experiences={experiences} techIcons={techIcons} />
      <Contact settings={settings} />
    </DesktopPanes>
  );
}
