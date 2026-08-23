import { Briefcase } from "lucide-react";

import { Timeline } from "@/components/experience/timeline/timeline";
import { Reveal } from "@/components/motion/reveal";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { hasDemoContent } from "@/lib/constants/demo-content";
import { type Experience as ExperienceEntry } from "@/lib/types/content";
import type { TechIconMap } from "@/lib/utils/tech-icons";

import { Section, headingId } from "./section";

/**
 * Experience — "THE TIMELINE MACHINE".
 *
 * A 3D tunnel of rings recedes behind a centred rail of role cards: the ring
 * nearest the camera tracks whichever card is centred in view, and a particle
 * stream accelerates with scroll speed. All of that interactive state lives in
 * the client-only `Timeline`; this stays a server component so the empty/demo
 * states below render without shipping any of it when there's nothing to show.
 */

const SECTION_ID = "experience";

interface ExperienceProps {
  experiences: ExperienceEntry[];
  /**
   * Logos for the technologies named in each role, keyed by name. Built from the
   * skills collection, so an icon set once in /admin/skills shows up here too.
   */
  techIcons: TechIconMap;
}

export function Experience({ experiences, techIcons }: ExperienceProps) {
  return (
    <Section id={SECTION_ID} tone="experience" className="border-y border-border bg-bg-subtle/40">
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="04 — Experience"
        title="Where I've worked"
        description="Roles, and what I was actually responsible for in each."
        note={hasDemoContent(experiences) ? <DemoBadge label="Sample roles" /> : null}
      />

      {experiences.length === 0 ? (
        <Reveal className="mt-12">
          <EmptyState
            icon={Briefcase}
            title="No experience entries yet"
            description="Roles added in the admin panel appear here as a timeline."
          />
        </Reveal>
      ) : (
        <Timeline experiences={experiences} techIcons={techIcons} />
      )}
    </Section>
  );
}
