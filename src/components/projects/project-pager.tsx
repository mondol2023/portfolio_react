import Link from "next/link";
import { ArrowLeft, ArrowRight, LayoutGrid } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { DEFAULT_IDENTITY, type ProjectIdentity } from "@/lib/constants/project-identity";
import type { Project } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";

/**
 * End-of-case-study navigation.
 *
 * The archive already has one canonical order — `order`, then start date,
 * descending — and both `/projects` and this page read the same sorted list, so
 * "previous" and "next" here mean the neighbours a reader would have seen in the
 * grid. That is the only ordering the schema supports honestly; nothing is
 * ranked by similarity, because nothing in the data says two projects are alike.
 *
 * Either side may be absent (the first case study has no previous, the last no
 * next) and the layout is built for that: the remaining link keeps its own
 * column rather than stretching across both, so the two ends of the archive
 * still look like the same component. The return-to-archive link is
 * unconditional — it is the one exit that always exists.
 *
 * It is also the last beat of the case study, and the seam between a story and
 * its sequel is the thing this component has to get right:
 *
 *   - It does not start with a border. A full-bleed rule is a *cut* — the story
 *     stops and a footer begins. `.story-resolve` is a settling instead: the
 *     ground darkens into the pager over a third of its height and the hairline
 *     at the top fades out at both ends, so the page arrives at this section
 *     rather than being partitioned from it. The thread running down the
 *     chapters reaches it (see `<StoryCoda>`), which is why there is no top
 *     margin here — the line occupies that distance now.
 *
 *   - It opens the way a chapter opens. Rule, then label, on the same left axis
 *     as every chapter number above it, so "End of case study" reads as one more
 *     heading in the sequence the reader has been following for seven of them
 *     instead of a centred caption belonging to a different document.
 *
 *   - The next project is the stronger object. Two identical cards ask the
 *     reader to choose; one lit and one quiet says the story continues this way
 *     and the other direction is still there if you want it. The weight is
 *     carried by surface, elevation and title size — the copy is untouched, and
 *     both links are exactly as clickable as before.
 *
 * That is the whole of the "transition" — a ground, a rule and a hierarchy, not
 * a second animation system bolted onto the end of the page.
 */

interface ProjectPagerProps {
  previous?: Project;
  next?: Project;
  /**
   * The identity of the project just finished, not of either neighbour.
   *
   * The pager stands outside the `<article>`, so it is the one place the
   * article's own `data-identity` cannot reach. It is published again here for
   * two readers and no third: the backdrop's existing observer, so the closing
   * scene is still the story's, and the `.story-resolve` rules in `globals.css`,
   * which give the ending the same resolution the chapters were composed with.
   * Nothing about the links changes — both are exactly as visible and as
   * clickable as they were.
   */
  identity?: ProjectIdentity;
}

interface PagerLinkProps {
  project: Project;
  direction: "previous" | "next";
}

function PagerLink({ project, direction }: PagerLinkProps) {
  const isNext = direction === "next";
  const Icon = isNext ? ArrowRight : ArrowLeft;

  return (
    // The grid placement lives on the animated wrapper, not the link: a
    // `display: contents` box cannot be transformed, so the item that moves has
    // to be the one that occupies the cell.
    <StaggerItem className={cn("min-w-0", isNext && "sm:col-start-2")}>
      <Link
        href={`/projects/${project.slug}`}
        className={cn(
          "group flex h-full flex-col gap-3 rounded-card border p-6",
          "transition-[border-color,box-shadow] duration-300",
          // The label is what makes the link name meaningful out of context
          // ("Next — Beacon"), so it is real text rather than an aria-label.
          isNext
            ? "border-border-strong bg-surface shadow-elevated hover:border-accent/50 hover:shadow-floating sm:items-end sm:text-right"
            : "border-border bg-surface/60 hover:border-border-strong hover:shadow-elevated",
        )}
      >
        <span className={cn("label-mono flex items-center gap-2", isNext && "sm:flex-row-reverse")}>
          <Icon
            aria-hidden="true"
            className={cn(
              "size-3.5 transition-transform",
              isNext
                ? "motion-safe:group-hover:translate-x-1"
                : "motion-safe:group-hover:-translate-x-1",
            )}
          />
          {isNext ? "Next" : "Previous"}
        </span>

        {/*
          The forward title is set like a chapter opening — serif, larger, the
          same face the story's own headings use — because that is what it is:
          the first line of the next one. The backward title stays a link label.
        */}
        <span
          className={cn(
            "tracking-tight text-balance text-fg group-hover:text-accent",
            isNext ? "font-serif text-2xl sm:text-3xl" : "text-lg font-semibold",
          )}
        >
          {project.title}
        </span>

        <span className="label-mono">{project.type}</span>
      </Link>
    </StaggerItem>
  );
}

export function ProjectPager({
  previous,
  next,
  identity = DEFAULT_IDENTITY,
}: ProjectPagerProps) {
  const hasNeighbour = Boolean(previous || next);

  return (
    /*
      Holds the story's closing stage rather than reverting to the archive's
      tone: the backdrop should still be the one the story resolved on while the
      reader decides where to go next. `relative` is load-bearing — the settling
      hairline is `.story-resolve::before`.
    */
    <Stagger
      as="nav"
      aria-label="More case studies"
      data-tone="story-clarity"
      data-tone-anchor=""
      data-identity={identity}
      className="story-resolve relative py-16 sm:py-20"
    >
      <div className="container-page">
        {hasNeighbour ? (
          <>
            <StaggerItem className="mb-10 sm:mb-12">
              <span aria-hidden="true" className="block h-px w-full bg-border" />
              <p className="label-mono mt-7">End of case study — continue reading</p>
            </StaggerItem>

            <div className="grid gap-4 sm:grid-cols-2">
              {previous ? <PagerLink project={previous} direction="previous" /> : null}
              {next ? <PagerLink project={next} direction="next" /> : null}
            </div>
          </>
        ) : null}

        <StaggerItem as="p" className={cn(hasNeighbour && "mt-12")}>
          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg"
          >
            <LayoutGrid aria-hidden="true" className="size-4 text-fg-subtle" />
            <span className="underline-offset-4 group-hover:underline">All projects</span>
          </Link>
        </StaggerItem>
      </div>
    </Stagger>
  );
}
