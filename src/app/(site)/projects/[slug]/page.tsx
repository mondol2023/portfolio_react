import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Code2, ExternalLink } from "lucide-react";

import { ProjectViewTracker } from "@/components/game/project-view-tracker";
import { Reveal } from "@/components/motion/reveal";
import { CaseStudyBlock } from "@/components/projects/case-study-block";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectGallery } from "@/components/projects/project-gallery";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { isDemoId } from "@/lib/constants/demo-content";
import { isAllowedImageSrc } from "@/lib/constants/images";
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
 * on first request instead of 404ing. Every case-study chapter is optional: the
 * page numbers whatever exists and omits the rest, so a short project reads as
 * a short page rather than a mostly-empty template.
 */

export const revalidate = 300;
export const dynamicParams = true;

const RELATED_COUNT = 2;

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
  title: string;
  content?: string;
  children?: ReactNode;
}

/** Builds the numbered chapter list, skipping anything the project has no data for. */
function buildChapters(project: Project): Chapter[] {
  const chapters: Chapter[] = [];

  const prose = (title: string, content: string | undefined) => {
    if (content?.trim()) chapters.push({ title, content });
  };

  prose("Overview", project.fullDescription);
  prose("The problem", project.caseStudy.problem);
  prose("The solution", project.caseStudy.solution);
  prose("Architecture & approach", project.caseStudy.approach);
  prose("Challenges", project.caseStudy.challenges);
  prose("Results", project.caseStudy.results);

  if (project.technologies.length > 0) {
    chapters.push({
      title: "Technologies",
      children: (
        <ul className="flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <li key={tech}>
              <Badge>{tech}</Badge>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (project.gallery.some(isAllowedImageSrc)) {
    chapters.push({
      title: "Screenshots",
      children: <ProjectGallery images={project.gallery} title={project.title} />,
    });
  }

  if (project.liveUrl || project.githubUrl) {
    chapters.push({
      title: "Links",
      children: (
        <ul className="flex flex-col gap-3">
          {project.liveUrl ? (
            <li>
              <ExternalResourceLink href={project.liveUrl} label="Live site" icon={ExternalLink} />
            </li>
          ) : null}
          {project.githubUrl ? (
            <li>
              <ExternalResourceLink href={project.githubUrl} label="Source code" icon={Code2} />
            </li>
          ) : null}
        </ul>
      ),
    });
  }

  return chapters;
}

function ExternalResourceLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof ExternalLink;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group inline-flex items-center gap-3 text-fg underline-offset-4 hover:text-accent"
    >
      <Icon aria-hidden="true" className="size-4 text-fg-subtle group-hover:text-accent" />
      <span className="font-medium group-hover:underline">{label}</span>
      <span className="text-sm text-fg-subtle">{href.replace(/^https?:\/\//, "")}</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const [project, settings] = await Promise.all([getProjectBySlug(slug), getSiteSettings()]);

  // Unpublished projects are not reachable by URL either — the published flag is
  // the whole access control for public content.
  if (!project || !project.published) notFound();

  const allProjects = await getPublishedProjects();
  const related = allProjects.filter((item) => item.id !== project.id).slice(0, RELATED_COUNT);

  const chapters = buildChapters(project);
  const year = formatYearRange(project.startDate, project.endDate);
  const range = formatDateRange(project.startDate, project.endDate, { presentLabel: "Ongoing" });

  return (
    <>
      <ProjectViewTracker projectId={project.id} />

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

      <article>
        <header
          data-tone="work"
          data-tone-anchor=""
          className="relative isolate overflow-hidden pt-32 pb-12 sm:pt-40"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="surface-grid absolute inset-0 [mask-image:radial-gradient(70%_70%_at_50%_0%,black,transparent)]" />
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

            <Reveal delay={0.05} className="mt-10 max-w-3xl">
              <p className="label-mono flex flex-wrap items-center gap-3">
                <span>{project.type}</span>
                {year ? (
                  <>
                    <span aria-hidden="true" className="h-px w-5 bg-border-strong" />
                    <time dateTime={project.startDate}>{range}</time>
                  </>
                ) : null}
                {isDemoId(project.id) ? <DemoBadge label="Sample case study" /> : null}
              </p>

              <h1 className="text-section mt-5 font-semibold text-fg">{project.title}</h1>

              <p className="text-lead mt-6 text-fg-muted">{project.shortDescription}</p>
            </Reveal>

            {project.liveUrl || project.githubUrl ? (
              <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-3">
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

        <Reveal className="container-page">
          <div className="relative aspect-[16/9] overflow-hidden rounded-card border border-border bg-bg-subtle">
            {isAllowedImageSrc(project.featuredImage) ? (
              <Image
                src={project.featuredImage}
                alt={`${project.title} — cover image`}
                fill
                priority
                sizes="(min-width: 1280px) 76rem, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="surface-grid absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-6xl text-fg-subtle/60">
                  {getMonogram(project.title)}
                </span>
              </div>
            )}
          </div>
        </Reveal>

        <div className="container-page">
          <div className="mt-20 flex flex-col gap-12 sm:mt-24">
            {chapters.map((chapter, index) => (
              <CaseStudyBlock
                key={chapter.title}
                index={String(index + 1).padStart(2, "0")}
                title={chapter.title}
                content={chapter.content}
              >
                {chapter.children}
              </CaseStudyBlock>
            ))}
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section
          aria-labelledby="related-heading"
          className="mt-24 border-t border-border bg-bg-subtle/40 py-20 sm:mt-32 sm:py-24"
        >
          <div className="container-page">
            <Reveal as="h2" id="related-heading" className="text-2xl font-semibold text-fg">
              More work
            </Reveal>

            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.id} className="flex">
                  <ProjectCard project={item} className="w-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
