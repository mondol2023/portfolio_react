import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { Curtain } from "@/components/motion/curtain";
import { Reveal } from "@/components/motion/reveal";
import { CaseStudyBlock } from "@/components/projects/case-study-block";
import { ProjectColophon } from "@/components/projects/project-colophon";
import { ProjectGallery } from "@/components/projects/project-gallery";
import { ProjectPager } from "@/components/projects/project-pager";
import { StoryCoda, StoryOverture } from "@/components/projects/story-bridge";
import { StoryCamera } from "@/components/projects/story-camera";
import { StoryFigure } from "@/components/projects/story-figure";
import { isActThreshold } from "@/components/projects/story-stage";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { isDemoId } from "@/lib/constants/demo-content";
import { isAllowedImageSrc } from "@/lib/constants/images";
import { identityForProject, type ProjectIdentity } from "@/lib/constants/project-identity";
import { absoluteUrl } from "@/lib/constants/site";
import { getMonogram } from "@/lib/constants/tech-brand";
import {
  getProjectBySlug,
  getPublishedProjectSlugs,
  getPublishedProjects,
} from "@/lib/firebase/repositories/projects-repository";
import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";
import type { Project } from "@/lib/types/content";
import { formatDateRange, formatYearRange } from "@/lib/utils/dates";

/**
 * Project case study.
 *
 * Statically generated per published slug and revalidated on a timer, with
 * `dynamicParams` left on so a project published after the last build resolves
 * on first request instead of 404ing.
 *
 * The page is written as a story rather than a record: the opening establishes
 * what the thing is, the chapters run context -> approach -> solution ->
 * evidence -> challenges -> outcome, the stack and links sit after the story as
 * credits, and the pager offers the next one. Every chapter is optional — the
 * page numbers whatever exists and omits the rest, so a short project reads as
 * a short page rather than a mostly-empty template. Nothing here invents a
 * chapter the CMS has no text for.
 *
 * One project, one visual world. The project's identity is resolved once here —
 * `identityForProject` — and travels down as a prop, published on the article,
 * on the hero and on every tone anchor as `data-identity`. From there it reaches
 * the three layers that express it, and no fourth: the `globals.css` motif rules,
 * the story variants in `story-motion.ts`, and the canvas scenes, which the
 * backdrop's existing observer reads off the same anchors it already reads the
 * tone from. It is visual interpretation only — it changes nothing the CMS says
 * and adds no text of its own.
 */

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project || !project.published) {
    // Metadata is resolved before the page decides to 404, so this is the title
    // the not-found response carries. Marking it noindex belts-and-braces the
    // 404 status for crawlers that cached the URL while it was live.
    return { title: "Project not found", robots: { index: false, follow: false } };
  }

  const url = `/projects/${project.slug}`;
  const images = project.featuredImage ? [project.featuredImage] : undefined;

  return {
    title: project.title,
    description: project.shortDescription,
    alternates: { canonical: url },
    // Demo case studies are readable but never indexable — placeholder content
    // in a search index outlives the placeholder itself.
    ...(isDemoId(project.id) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "article",
      title: project.title,
      description: project.shortDescription,
      url,
      images,
      publishedTime: project.startDate,
      modifiedTime: project.updatedAt,
      tags: project.technologies,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.shortDescription,
      images,
    },
  };
}

interface Chapter {
  /** Stable across projects, so a heading anchor does not shift with numbering. */
  id: string;
  title: string;
  content?: string;
  children?: ReactNode;
  /** Set on the closing chapter so outcomes read louder than the setup. */
  emphasis?: boolean;
}

/**
 * Builds the numbered chapter list, skipping anything the project has no data
 * for.
 *
 * The order is the narrative one — what it is, what was wrong, how it was
 * approached, what was built, what it looks like, what fought back, what came
 * of it — rather than the order the fields happen to sit in on the document.
 */
function buildChapters(project: Project, identity: ProjectIdentity): Chapter[] {
  const chapters: Chapter[] = [];

  const prose = (id: string, title: string, content: string | undefined, emphasis = false) => {
    if (content?.trim()) chapters.push({ id, title, content, emphasis });
  };

  prose("overview", "Overview", project.fullDescription);
  prose("problem", "The problem", project.caseStudy.problem);
  prose("approach", "Architecture & approach", project.caseStudy.approach);
  prose("solution", "The solution", project.caseStudy.solution);

  // The gallery sits here because it is evidence for the solution just
  // described, not an appendix of screenshots at the end of the document.
  if (project.gallery.some(isAllowedImageSrc)) {
    // The title is bound once rather than written twice: the gallery hands it
    // to the evidence viewer, so a reader who steps into a screenshot can still
    // see which chapter they stepped out of.
    const screens = "Screens";
    chapters.push({
      id: "screens",
      title: screens,
      children: (
        <ProjectGallery
          images={project.gallery}
          title={project.title}
          context={screens}
          identity={identity}
        />
      ),
    });
  }

  prose("challenges", "Challenges", project.caseStudy.challenges);
  prose("results", "Results", project.caseStudy.results, true);

  return chapters;
}

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const [project, settings] = await Promise.all([getProjectBySlug(slug), getSiteSettings()]);

  // Unpublished projects are not reachable by URL either — the published flag is
  // the whole access control for public content.
  if (!project || !project.published) notFound();

  // The archive's own order, so "previous" and "next" are the neighbours the
  // reader would have seen in the grid. This list is already in the request
  // cache — `getProjectBySlug` falls through to it — so it costs no extra read.
  const allProjects = await getPublishedProjects();
  const position = allProjects.findIndex((item) => item.id === project.id);
  const previous = position > 0 ? allProjects[position - 1] : undefined;
  const next = position >= 0 ? allProjects[position + 1] : undefined;

  // Resolved once, from the slug the CMS already stores. Unlisted projects get
  // `base`, which is this page exactly as it was written.
  const identity = identityForProject(project.slug, project.title);
  const chapters = buildChapters(project, identity);
  // Printed beside every chapter number, so the reader can see how far through
  // the story they are without the page growing a progress element.
  const total = String(chapters.length).padStart(2, "0");
  const year = formatYearRange(project.startDate, project.endDate);
  const range = formatDateRange(project.startDate, project.endDate, { presentLabel: "Ongoing" });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          headline: project.title,
          description: project.shortDescription,
          url: absoluteUrl(`/projects/${project.slug}`),
          dateCreated: project.startDate,
          ...(project.updatedAt ? { dateModified: project.updatedAt } : {}),
          ...(project.featuredImage ? { image: project.featuredImage } : {}),
          keywords: project.technologies.join(", "),
          author: { "@type": "Person", name: settings.name },
        }}
      />

      {/* The identity is declared once, on the story's own root. Everything
          inside it — planes, threads, the coda — is composed by CSS from here. */}
      <article data-identity={identity}>
        {/*
          The opening. All of it is above the fold on load, so the sequencing is
          measured in fractions of a second and nothing waits on a scroll
          position: back link, then the metadata line, then the title rising out
          of it, then the description, then the actions. The longest a reader
          ever waits for readable text is under a third of a second.

          The tone is `story-open` rather than `work`, so the backdrop the reader
          arrived on cross-fades into the first act of this project's story
          instead of holding on the archive's.
        */}
        <header
          data-tone="story-open"
          data-tone-anchor=""
          data-identity={identity}
          className="relative isolate overflow-hidden pt-32 pb-12 sm:pt-40 sm:pb-16"
        >
          {/*
            The opening field. The same grid the page always opened on, with the
            project's motif laid over it by `.story-hero-field` — a composition
            rather than an animation, so it is identical under reduced motion.
          */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="story-hero-field surface-grid absolute inset-0 [mask-image:radial-gradient(70%_70%_at_50%_0%,black,transparent)]" />
          </div>

          <div className="container-page">
            <Reveal as="p" distance={0}>
              <Link
                href="/projects"
                className="group inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4 transition-transform motion-safe:group-hover:-translate-x-1"
                />
                All projects
              </Link>
            </Reveal>

            <div className="mt-10 max-w-3xl sm:mt-12">
              <Reveal
                as="p"
                delay={0.05}
                distance={0.5}
                className="label-mono flex flex-wrap items-center gap-3"
              >
                <span>{project.type}</span>
                {year ? (
                  <>
                    <span aria-hidden="true" className="h-px w-5 bg-border-strong" />
                    <time dateTime={project.startDate}>{range}</time>
                  </>
                ) : null}
                {isDemoId(project.id) ? <DemoBadge label="Sample case study" /> : null}
              </Reveal>

              {/*
                The one place on this page that clips rather than fades. A case
                study has exactly one title and it should feel like a curtain
                going up; repeating the effect on the chapter headings below
                would turn a gesture into a tic.
              */}
              <Curtain delay={0.12} className="mt-5">
                <h1 className="text-section font-semibold text-balance text-fg">{project.title}</h1>
              </Curtain>

              <Reveal as="p" delay={0.22} className="text-lead mt-6 max-w-[60ch] text-fg-muted">
                {project.shortDescription}
              </Reveal>
            </div>

            {project.liveUrl || project.githubUrl ? (
              <Reveal delay={0.28} className="mt-10 flex flex-wrap gap-3">
                {project.liveUrl ? (
                  <ButtonLink href={project.liveUrl} target="_blank" rel="noreferrer noopener">
                    Visit live site
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </ButtonLink>
                ) : null}
                {project.githubUrl ? (
                  <ButtonLink
                    href={project.githubUrl}
                    variant="secondary"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    View source
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </ButtonLink>
                ) : null}
              </Reveal>
            ) : null}
          </div>
        </header>

        {/*
          The cover arrives a beat after the title rather than with it — two
          things entering together read as a page loading, one after the other
          reads as a page being introduced. Taller crop on phones, where a 16/9
          band is barely a stripe.
        */}
        <StoryFigure delay={0.1} identity={identity} className="container-page">
          <div className="story-frame story-frame--lead relative aspect-[4/3] overflow-hidden rounded-card border border-border bg-bg-subtle shadow-elevated sm:aspect-[16/9]">
            {isAllowedImageSrc(project.featuredImage) ? (
              // The one scroll-linked move on the page: the picture drifts
              // inside a frame that does not, so the opening shot has depth.
              // The monogram fallback deliberately sits still — there is no
              // photograph behind it to be behind.
              <StoryCamera>
                <Image
                  src={project.featuredImage}
                  alt={`${project.title} — cover image`}
                  fill
                  priority
                  sizes="(min-width: 1280px) 76rem, 100vw"
                  className="object-cover"
                />
              </StoryCamera>
            ) : (
              <div className="surface-grid absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-6xl text-fg-subtle/60">
                  {getMonogram(project.title)}
                </span>
              </div>
            )}
          </div>
        </StoryFigure>

        <div className="container-page">
          {/*
            The bridge out of the opening shot. It stands in the gap the
            chapters used to open with as bare margin, and it is the same line
            the chapters are threaded together with — so chapter one is arrived
            at by something that started under the cover rather than simply
            appearing below it. See `story-bridge.tsx`.
          */}
          <StoryOverture />

          {/*
            Chapters are spaced far enough apart that only one of them is the
            subject of the screen at a time. The spacing is the transition: it
            is what lets a chapter's rule-then-heading-then-body sequence land
            before the next chapter starts crowding in underneath it — and it is
            the gap the connector thread is drawn through, so the distance reads
            as a beat in one story rather than a break between two cards.
          */}
          <div className="flex flex-col gap-20 sm:gap-28">
            {chapters.map((chapter, index) => (
              <CaseStudyBlock
                key={chapter.id}
                id={chapter.id}
                index={String(index + 1).padStart(2, "0")}
                total={total}
                title={chapter.title}
                content={chapter.content}
                emphasis={chapter.emphasis}
                connected={index > 0}
                last={index === chapters.length - 1}
                // Act boundaries are read off the chapter list rather than
                // written down: whichever chapters happen to exist, the
                // thresholds land where the story actually turns.
                threshold={isActThreshold(chapters[index - 1]?.id, chapter.id)}
                identity={identity}
              >
                {chapter.children}
              </CaseStudyBlock>
            ))}
          </div>

          <ProjectColophon
            technologies={project.technologies}
            liveUrl={project.liveUrl}
            githubUrl={project.githubUrl}
          />

          {/* The thread's last length: it disperses into the pager's ground
              instead of being cut off by a section boundary. */}
          <StoryCoda />
        </div>
      </article>

      {/* Outside the article, so the identity it resolves on is passed rather
          than inherited — see `ProjectPagerProps`. */}
      <ProjectPager previous={previous} next={next} identity={identity} />
    </>
  );
}
