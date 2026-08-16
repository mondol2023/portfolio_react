import { Briefcase, Sparkle } from "lucide-react";

import { Curtain } from "@/components/motion/curtain";
import { Reveal } from "@/components/motion/reveal";
import { ScrollProgressLine } from "@/components/motion/scroll-progress-line";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { TechChip } from "@/components/ui/tech-chip";
import { hasDemoContent } from "@/lib/constants/demo-content";
import {
  EMPLOYMENT_TYPE_LABELS,
  type Experience as ExperienceEntry,
} from "@/lib/types/content";
import { formatDateRange, formatDuration, toDateTimeAttribute } from "@/lib/utils/dates";
import { lookupTechIcon, type TechIconMap } from "@/lib/utils/tech-icons";

import { Section, headingId } from "./section";

/**
 * Experience timeline.
 *
 * One column on mobile with the rail tucked against the left edge, and a wider
 * two-column reading layout from `lg` up. The rail fills in the section's tone
 * as you read down it.
 *
 * Each role reveals in two beats: the dates, title and employer fade in as
 * usual, then the detail underneath — summary, what the work actually was, and
 * the stack it was built on — slides up from behind its own top edge. That is
 * the "come out from hiding" the detail deserves and the header does not: the
 * header is what you scan, the detail is what rewards stopping.
 *
 * The detail is ordered the way it gets read: one paragraph of context, then the
 * specifics as marked points, then the tools as logos. The stack goes last and
 * as marks rather than words because it is what a reader skims back to find.
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
        <ScrollProgressLine className="mt-16">
          <ol className="space-y-12 pl-6 sm:pl-10">
            {experiences.map((entry) => {
              const hasDetail =
                Boolean(entry.description) ||
                entry.responsibilities.length > 0 ||
                entry.technologies.length > 0;

              return (
                <li key={entry.id} className="relative">
                  {/* Node on the rail. Centred on the 1px line to either side. */}
                  <span
                    aria-hidden="true"
                    className={`absolute top-2 -left-6 size-2.5 -translate-x-1/2 rounded-full ring-4 ring-bg-subtle sm:-left-10 ${
                      entry.isCurrent ? "bg-tone" : "bg-border-strong"
                    }`}
                  />

                  <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-12">
                    <Reveal className="lg:pt-1">
                      <p className="label-mono">
                        <time dateTime={toDateTimeAttribute(entry.startDate)}>
                          {formatDateRange(entry.startDate, entry.endDate)}
                        </time>
                      </p>
                      <p className="mt-2 text-xs text-fg-subtle">
                        {formatDuration(entry.startDate, entry.endDate)}
                      </p>
                    </Reveal>

                    <div className="mt-4 lg:mt-0">
                      <Reveal delay={0.05}>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold tracking-tight text-fg">
                            {entry.position}
                          </h3>
                          {entry.isCurrent ? <Badge variant="success">Current</Badge> : null}
                        </div>

                        <p className="mt-1.5 text-sm text-fg-muted">
                          {entry.companyUrl ? (
                            <a
                              href={entry.companyUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="font-medium text-fg underline-offset-4 hover:underline"
                            >
                              {entry.company}
                            </a>
                          ) : (
                            <span className="font-medium text-fg">{entry.company}</span>
                          )}
                          <span aria-hidden="true"> · </span>
                          {EMPLOYMENT_TYPE_LABELS[entry.employmentType]}
                          {entry.location ? (
                            <>
                              <span aria-hidden="true"> · </span>
                              {entry.location}
                            </>
                          ) : null}
                        </p>
                      </Reveal>

                      {hasDetail ? (
                        <Curtain delay={0.12} className="mt-4">
                          {/* Hairline in the section tone, so the detail reads as
                              having emerged from under the header rather than
                              simply being the next paragraph. */}
                          <span
                            aria-hidden="true"
                            className="block h-px w-10 bg-tone/50"
                          />

                          {entry.description ? (
                            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                              {entry.description}
                            </p>
                          ) : null}

                          {entry.responsibilities.length > 0 ? (
                            /*
                             * What the role actually was, one point per line. The
                             * marker is an icon in the section tone rather than a
                             * disc, and it sits in its own column so a point that
                             * wraps stays aligned under its own first word.
                             */
                            <ul className="mt-4 space-y-2.5">
                              {entry.responsibilities.map((item) => (
                                <li
                                  key={item}
                                  className="grid grid-cols-[auto_1fr] gap-x-2.5 text-sm leading-relaxed text-fg-muted"
                                >
                                  <Sparkle
                                    aria-hidden="true"
                                    className="mt-1 size-3.5 shrink-0 fill-tone/20 text-tone"
                                  />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {entry.technologies.length > 0 ? (
                            <ul
                              aria-label={`Technologies used at ${entry.company}`}
                              className="mt-6 flex flex-wrap gap-2"
                            >
                              {entry.technologies.map((tech) => (
                                <li key={tech}>
                                  <TechChip
                                    name={tech}
                                    iconUrl={lookupTechIcon(techIcons, tech)}
                                  />
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </Curtain>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </ScrollProgressLine>
      )}
    </Section>
  );
}
