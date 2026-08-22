import { HudPanel } from "@/components/experience/profile/hud-panel";
import { HudShell } from "@/components/experience/profile/hud-shell";
import { PlayerCard } from "@/components/experience/profile/player-card";
import { StatCounter } from "@/components/experience/profile/stat-counter";
import { DemoBadge } from "@/components/ui/demo-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { isDemoAboutStats } from "@/lib/constants/demo-content";
import type { About as AboutContent, SiteSettings } from "@/lib/types/content";
import type { PlayerLevel } from "@/lib/utils/career";

import { Section, headingId } from "./section";

/**
 * About — the player profile.
 *
 * The same three prose blocks and statistics the `about/main` document has
 * always owned, presented as a game readout: an identity card that turns with
 * the pointer, panels that assemble from different edges, statistics that count
 * up, and a scan line crossing the whole thing.
 *
 * The framing is the only thing that is invented. PLAYER, CLASS, REGION and
 * STATUS are the site settings the owner already fills in, and LEVEL is derived
 * from the real work history — nothing here is a number chosen to look good.
 *
 * A server component: every animated part below is an already-client primitive,
 * so this file ships no JavaScript of its own.
 */

const SECTION_ID = "about";

/** Panels arrive from alternating edges so the grid assembles rather than fades. */
const STAT_EDGES = ["top", "bottom", "top", "bottom"] as const;

interface AboutProps {
  about: AboutContent;
  settings: SiteSettings;
  /** Null when there is no dated work history to derive a level from. */
  level: PlayerLevel | null;
}

export function About({ about, settings, level }: AboutProps) {
  const hasStats = about.stats.length > 0;
  const demoStats = isDemoAboutStats(about.stats);

  return (
    <Section id={SECTION_ID} tone="about">
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="01 — Player profile"
        title="The short version"
        description={about.introduction}
        note={demoStats ? <DemoBadge label="Sample statistics" /> : null}
      />

      <HudShell className="mt-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start">
          <PlayerCard
            name={settings.name}
            title={settings.title}
            location={settings.location}
            availabilityStatus={settings.availabilityStatus}
            availabilityLabel={settings.availabilityLabel}
            level={level}
          />

          <div className="grid gap-6">
            <HudPanel label="Philosophy" from="right">
              <p className="text-base leading-relaxed text-fg-muted">{about.philosophy}</p>
            </HudPanel>

            <HudPanel label="Where I work" from="right" delay={0.1}>
              <p className="text-base leading-relaxed text-fg-muted">{about.summary}</p>
            </HudPanel>
          </div>
        </div>

        {hasStats ? (
          <dl
            aria-label="Key statistics"
            className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {about.stats.map((stat, index) => (
              <HudPanel
                key={`${stat.label}-${stat.value}`}
                // `as` is not available here, so the panel stays a div and the
                // term/description pair lives inside it. `dl` permits that as
                // long as each group is wrapped, which is exactly what this is.
                from={STAT_EDGES[index % STAT_EDGES.length] ?? "top"}
                delay={index * 0.06}
                className="p-5 sm:p-6"
              >
                <dt className="label-mono text-fg-subtle">{stat.label}</dt>
                <dd className="mt-3 text-4xl font-semibold tracking-tight text-fg">
                  <StatCounter value={stat.value} />
                </dd>
                {stat.detail ? (
                  <dd className="mt-2 text-sm leading-relaxed text-fg-subtle">{stat.detail}</dd>
                ) : null}
              </HudPanel>
            ))}
          </dl>
        ) : null}
      </HudShell>
    </Section>
  );
}
