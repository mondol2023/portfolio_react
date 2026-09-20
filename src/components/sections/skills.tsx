import { Layers } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { SkillGalaxy } from "@/components/skills/skill-galaxy";
import { SkillsVariantSwitch } from "@/components/skills/skills-variant-switch";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { hasDemoContent } from "@/lib/constants/demo-content";
import type { Skill } from "@/lib/types/content";
import { SkillsSceneBridge } from "@/three/bridge/scene-data-bridge";

import { Section, headingId } from "./section";

/**
 * Tech stack.
 *
 * One continuous chain of every technology, dealt across a few lines that
 * scroll in alternating directions. Deliberately not split into a row per
 * category: the categories are still recorded (and still how a skill is
 * entered), but as something a pill can tell you rather than as five headings.
 *
 * There are also no proficiency bars: a percentage against a technology is a
 * number nobody can justify.
 *
 * The chain breaks out of the page gutter with negative margins so it runs to
 * the viewport edge on narrow screens. Margins rather than the usual `100vw` /
 * `left-1/2` trick because `100vw` includes the scrollbar on desktop Windows
 * and Linux, which adds a horizontal scrollbar to the whole document.
 */

const SECTION_ID = "skills";

export function Skills({ skills }: { skills: Skill[] }) {
  return (
    <Section id={SECTION_ID} tone="stack" className="border-y border-border bg-bg-subtle/40">
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="02 — Stack"
        title="Tools I reach for"
        description="The technologies I use often enough to have opinions about. Click one to bring it forward and see where it sits; hover a line to hold it still."
        note={hasDemoContent(skills) ? <DemoBadge /> : null}
      />

      <Reveal className="mt-16">
        {skills.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No technologies published yet"
            description="Skills added in the admin panel appear here as part of the chain."
          />
        ) : (
          <SkillsVariantSwitch skills={skills} />
        )}
      </Reveal>

      {/* Game Mode only, opt-in — renders nothing in Normal Mode. See SkillGalaxy. */}
      <SkillGalaxy skills={skills} />
      {/* Hands this section's data to the persistent 3D scene; renders nothing. */}
      <SkillsSceneBridge skills={skills} />
    </Section>
  );
}
