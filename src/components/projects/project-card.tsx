import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { isAllowedImageSrc } from "@/lib/constants/images";
import { getMonogram } from "@/lib/constants/tech-brand";
import type { Project } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";
import { formatYearRange } from "@/lib/utils/dates";

/**
 * Project card.
 *
 * The whole card is one link: a stretched overlay over the article rather than
 * nested anchors, so there is exactly one tab stop and the focus ring wraps the
 * entire card. Tech tags are plain text, not links, for the same reason.
 */

const MAX_TAGS = 4;

interface ProjectCardProps {
  project: Project;
  /** Larger treatment used for the first card in the featured grid. */
  emphasis?: boolean;
  /** Set on the first card above the fold so its image is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}

export function ProjectCard({
  project,
  emphasis = false,
  priority = false,
  className,
}: ProjectCardProps) {
  const year = formatYearRange(project.startDate, project.endDate);
  const visibleTags = project.technologies.slice(0, MAX_TAGS);
  const hiddenTags = project.technologies.length - visibleTags.length;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface",
        "transition-[border-color,box-shadow,transform] duration-300",
        "hover:border-border-strong hover:shadow-elevated focus-within:border-border-strong",
        "motion-safe:hover:-translate-y-1",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden border-b border-border bg-bg-subtle",
          emphasis ? "aspect-[16/10]" : "aspect-[16/9]",
        )}
      >
        {isAllowedImageSrc(project.featuredImage) ? (
          <Image
            src={project.featuredImage}
            alt=""
            fill
            priority={priority}
            sizes={emphasis ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          // Placeholder rather than a broken frame: initials on the section grid.
          <div className="surface-grid absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-5xl text-fg-subtle/60">
              {getMonogram(project.title)}
            </span>
          </div>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col p-6", emphasis && "sm:p-8")}>
        <p className="label-mono flex items-center gap-3">
          <span>{project.type}</span>
          {year ? (
            <>
              <span aria-hidden="true" className="h-px w-4 bg-border-strong" />
              <span>{year}</span>
            </>
          ) : null}
        </p>

        <h3
          className={cn(
            "mt-4 font-semibold tracking-tight text-fg",
            emphasis ? "text-2xl sm:text-3xl" : "text-xl",
          )}
        >
          <Link
            href={`/projects/${project.slug}`}
            // Stretched link: covers the card without nesting interactive elements.
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {project.title}
            <span className="sr-only"> — read the case study</span>
          </Link>
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">
          {project.shortDescription}
        </p>

        {visibleTags.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {visibleTags.map((tech) => (
              <li key={tech}>
                <Badge variant="outline">{tech}</Badge>
              </li>
            ))}
            {hiddenTags > 0 ? (
              <li>
                <Badge variant="outline">+{hiddenTags} more</Badge>
              </li>
            ) : null}
          </ul>
        ) : null}

        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-accent transition-transform motion-safe:group-hover:translate-x-1"
        >
          Read case study
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </article>
  );
}
