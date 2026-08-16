import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { DemoBadge } from "@/components/ui/demo-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { isDemoAboutStats } from "@/lib/constants/demo-content";
import type { About as AboutContent } from "@/lib/types/content";

import { Section, headingId } from "./section";

/**
 * About.
 *
 * Three prose blocks plus optional statistics, all owned by the `about/main`
 * Firestore document. The statistics grid disappears entirely when the owner
 * has not entered any — an empty row of zeroes would be worse than nothing.
 */

const SECTION_ID = "about";

export function About({ about }: { about: AboutContent }) {
  const hasStats = about.stats.length > 0;
  const demoStats = isDemoAboutStats(about.stats);

  return (
    <Section id={SECTION_ID} tone="about">
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="01 — About"
        title="The short version"
        description={about.introduction}
        note={demoStats ? <DemoBadge label="Sample statistics" /> : null}
      />

      <div className="mt-16 grid gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-2">
        <Reveal className="bg-surface p-8 sm:p-10">
          <p className="label-mono mb-4">Philosophy</p>
          <p className="text-base leading-relaxed text-fg-muted">{about.philosophy}</p>
        </Reveal>

        <Reveal delay={0.08} className="bg-surface p-8 sm:p-10">
          <p className="label-mono mb-4">Where I work</p>
          <p className="text-base leading-relaxed text-fg-muted">{about.summary}</p>
        </Reveal>
      </div>

      {hasStats ? (
        <Stagger
          as="dl"
          className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4"
          aria-label="Key statistics"
        >
          {about.stats.map((stat) => (
            <StaggerItem key={`${stat.label}-${stat.value}`}>
              <dt className="label-mono">{stat.label}</dt>
              <dd className="mt-3 text-4xl font-semibold tracking-tight text-fg">{stat.value}</dd>
              {stat.detail ? (
                <dd className="mt-2 text-sm leading-relaxed text-fg-subtle">{stat.detail}</dd>
              ) : null}
            </StaggerItem>
          ))}
        </Stagger>
      ) : null}
    </Section>
  );
}
