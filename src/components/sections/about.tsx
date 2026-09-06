import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { DemoBadge } from "@/components/ui/demo-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { isDemoAboutStats } from "@/lib/constants/demo-content";
import type { About as AboutContent, Experience } from "@/lib/types/content";
import { playerLevel } from "@/lib/utils/career";

import { Section, headingId } from "./section";

/**
 * About.
 *
 * Three prose blocks plus optional statistics, all owned by the `about/main`
 * Firestore document. The statistics grid disappears entirely when the owner
 * has not entered any — an empty row of zeroes would be worse than nothing.
 *
 * The optional "Player Profile" strip above it is `playerLevel()` from
 * `career.ts` — a level and progress bar derived from real experience start
 * dates, not invented for the occasion. It renders nothing when there isn't
 * enough experience data to derive a level from, rather than show a zero.
 */

const SECTION_ID = "about";

export function About({
  about,
  experiences = [],
}: {
  about: AboutContent;
  experiences?: Experience[];
}) {
  const hasStats = about.stats.length > 0;
  const demoStats = isDemoAboutStats(about.stats);
  const level = playerLevel(experiences);

  return (
    <Section id={SECTION_ID} tone="about">
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="01 — About"
        title="The short version"
        description={about.introduction}
        note={demoStats ? <DemoBadge label="Sample statistics" /> : null}
      />

      {level ? (
        <Reveal className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-card border border-border bg-surface/60 px-6 py-4">
          <p className="label-mono whitespace-nowrap">
            Level <span className="text-base text-fg">{level.level}</span>
            <span className="text-fg-subtle"> — building since {level.startYear}</span>
          </p>
          <div
            aria-hidden="true"
            className="h-1.5 min-w-24 flex-1 basis-32 overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
        </Reveal>
      ) : null}

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
