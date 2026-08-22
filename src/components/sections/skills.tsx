import { Layers } from "lucide-react";

import { SkillUniverse } from "@/components/experience/skills/skill-universe";
import { Reveal } from "@/components/motion/reveal";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { hasDemoContent } from "@/lib/constants/demo-content";
import type { Skill } from "@/lib/types/content";

import { Section, headingId } from "./section";

/**
 * Skill universe.
 *
 * The stack as a solar system: a technology per planet, a category per orbit,
 * turning around a core. Categories were never worth a heading each — but they
 * are worth a distance from the centre and a colour, which is what this turns
 * them into.
 *
 * The scrolling chain the section used to be is still here, one press away,
 * and it is what reduced motion and weak hardware start on. There are still no
 * proficiency bars: a percentage against a technology is a number nobody can
 * justify. Proficiency decides how big a world is, and that is as precise as it
 * pretends to be.
 *
 * A server component — `SkillUniverse` is the client island, and Three.js
 * arrives in its own chunk behind a dynamic import inside it.
 */

const SECTION_ID = "skills";

export function Skills({ skills }: { skills: Skill[] }) {
  return (
    <Section id={SECTION_ID} tone="stack" className="border-y border-border bg-bg-subtle/40">
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="02 — Skill universe"
        title="Tools I reach for"
        description="The technologies I use often enough to have opinions about. Turn the system, focus a world, or switch to the chain if you would rather just read the list."
        note={hasDemoContent(skills) ? <DemoBadge /> : null}
      />

      <Reveal className="mt-16">
        {skills.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No technologies published yet"
            description="Skills added in the admin panel appear here as worlds in the galaxy."
          />
        ) : (
          <SkillUniverse skills={skills} />
        )}
      </Reveal>
    </Section>
  );
}
