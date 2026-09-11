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
 * nested anchors, so there is exactly one tab stop and the keyboard focus ring
 * wraps the entire card. Tech tags are plain text, not links, for the same reason.
 *
 * Hover reveal: when the project has a gallery frame distinct from its
 * thumbnail, the two crossfade on hover and on keyboard focus. It is CSS only —
 * no state, no listeners, so the card stays a server component — and it is
 * gated behind `motion-safe:`, which leaves the thumbnail in place for readers
 * who asked for less motion rather than swapping it instantly.
 *
 * Keyboard focus gets the whole response, not a subset: the same crossfade, the
 * same push-in, the same shadow the pointer gets. The one thing it deliberately
 * does not get is the card's hover lift — moving the element that currently
 * holds focus, under the reader, is disorienting in a way that hovering never
 * is.
 *
 * Everything that moves here is `transform` or `opacity` on an element that is
 * already `fill`-positioned inside a fixed-aspect box, so no state of this card
 * can shift the grid around it.
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

  const sizes = emphasis
    ? "(min-width: 1024px) 60vw, 100vw"
    : "(min-width: 1024px) 33vw, 100vw";

  const featured = isAllowedImageSrc(project.featuredImage) ? project.featuredImage : undefined;

  // The second frame is the first gallery image that is renderable and is not
  // simply the thumbnail again — a card with one picture should not "reveal" it.
  const reveal = featured
    ? project.gallery.find((src) => isAllowedImageSrc(src) && src !== featured)
    : undefined;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface",
        "transition-[border-color,box-shadow,transform] duration-300",
        "hover:border-border-strong hover:shadow-elevated",
        "focus-within:border-border-strong focus-within:shadow-elevated",
        // The stretched link drops its own outline (it is a text-sized box in
        // the corner of the card, so a ring around it would point at the wrong
        // thing); the ring is drawn here instead, around what the link actually
        // activates. `has-[a:focus-visible]` rather than `focus-within` so a
        // pointer click does not leave a ring behind — a keyboard-visible focus
        // state is the requirement, a click-visible one is noise.
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2",
        "has-[a:focus-visible]:outline-accent",
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
        {featured ? (
          <>
            <Image
              src={featured}
              alt=""
              fill
              priority={priority}
              sizes={sizes}
              className={cn(
                // 300ms, the same as the card's border and shadow: the frame
                // and what is inside it are one response to one pointer, and at
                // 500 the image was still arriving after the card had settled.
                "object-cover transition-[transform,opacity] duration-300",
                "motion-safe:group-hover:scale-[1.03] motion-safe:group-focus-within:scale-[1.03]",
                reveal &&
                  "motion-safe:group-hover:opacity-0 motion-safe:group-focus-within:opacity-0",
              )}
            />
            {reveal ? (
              // Decorative (`alt=""`) and never a tab stop, so the stretched
              // link below stays the card's only interactive element.
              <Image
                src={reveal}
                alt=""
                fill
                sizes={sizes}
                className={cn(
                  "object-cover opacity-0 transition-[transform,opacity] duration-300",
                  "motion-safe:group-hover:scale-[1.03] motion-safe:group-hover:opacity-100",
                  "motion-safe:group-focus-within:scale-[1.03] motion-safe:group-focus-within:opacity-100",
                )}
              />
            ) : null}
          </>
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
          className={cn(
            "mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-accent",
            "transition-transform motion-safe:group-hover:translate-x-1",
            "motion-safe:group-focus-within:translate-x-1",
          )}
        >
          Read case study
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </article>
  );
}
