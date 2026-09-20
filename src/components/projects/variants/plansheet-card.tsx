import Link from "next/link";

import type { Project } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";
import { formatYearRange } from "@/lib/utils/dates";
import {
  MISSION_SCOPE_LABELS,
  PROJECT_STATUS_LABELS,
  missionScope,
  projectStatus,
} from "@/lib/utils/project-status";

interface PlansheetCardProps {
  project: Project;
  emphasis?: boolean;
  className?: string;
}

const MAX_TAGS = 4;

/**
 * Blueprint's Projects DOM variant (§4.4, Phase G) — a dashed drafting sheet
 * instead of `project-card.tsx`'s photographic card: no image, no tilt, plain
 * monospace metadata in brackets. Still one stretched link over the whole
 * article, the same accessibility contract `project-card.tsx` uses, since
 * that part of the pattern has nothing to do with which scenery is active.
 */
export function PlansheetCard({ project, emphasis = false, className }: PlansheetCardProps) {
  const year = formatYearRange(project.startDate, project.endDate);
  const visibleTags = project.technologies.slice(0, MAX_TAGS);
  const hiddenTags = project.technologies.length - visibleTags.length;
  const status = projectStatus(project);
  const scope = missionScope(project);

  return (
    <article
      className={cn(
        "group relative flex flex-col border border-dashed border-border-strong p-6 font-mono",
        "transition-colors duration-200 hover:border-accent focus-within:border-accent",
        emphasis && "sm:p-8",
        className,
      )}
    >
      <p className="flex items-center gap-3 text-xs tracking-widest text-fg-subtle uppercase">
        <span>[ {project.type} ]</span>
        {year ? <span>{year}</span> : null}
      </p>

      <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-fg-subtle">
        <span className="text-accent">{PROJECT_STATUS_LABELS[status]}</span>
        <span>{MISSION_SCOPE_LABELS[scope]}</span>
      </p>

      <h3
        className={cn(
          "relative mt-4 font-semibold tracking-tight text-fg",
          emphasis ? "text-2xl sm:text-3xl" : "text-xl",
        )}
      >
        <Link
          href={`/projects/${project.slug}`}
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {project.title}
          <span className="sr-only"> — read the case study</span>
        </Link>
      </h3>

      <p className="relative mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">
        {project.shortDescription}
      </p>

      {visibleTags.length > 0 ? (
        <ul className="relative mt-6 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-fg-subtle">
          {visibleTags.map((tech) => (
            <li key={tech}>[{tech}]</li>
          ))}
          {hiddenTags > 0 ? <li>[+{hiddenTags}]</li> : null}
        </ul>
      ) : null}

      <span
        aria-hidden="true"
        className="relative mt-auto inline-flex items-center gap-1.5 pt-6 text-sm text-accent transition-transform motion-safe:group-hover:translate-x-1"
      >
        {">> read case study"}
      </span>
    </article>
  );
}
