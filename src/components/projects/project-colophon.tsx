import { Code2, ExternalLink } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/types/content";

/**
 * The credits at the end of the story.
 *
 * The stack and the outbound links used to be numbered chapters, which gave a
 * list of tag pills the same billing as the problem the project solved. They
 * are reference material: a reader wants them after they understand what the
 * thing is, and wants them compact. So they sit below the last chapter, share
 * the chapters' indent, and carry no chapter number — the story ended at
 * Results.
 *
 * Returns nothing when the project has neither, which is why the page can call
 * it unconditionally.
 */

interface ProjectColophonProps {
  technologies: string[];
  liveUrl?: Project["liveUrl"];
  githubUrl?: Project["githubUrl"];
}

const LINK_CLASS =
  "group inline-flex items-center gap-2.5 text-sm text-fg underline-offset-4 hover:text-accent";

export function ProjectColophon({ technologies, liveUrl, githubUrl }: ProjectColophonProps) {
  const hasTech = technologies.length > 0;
  const hasLinks = Boolean(liveUrl || githubUrl);
  if (!hasTech && !hasLinks) return null;

  return (
    <Stagger as="section" aria-labelledby="colophon-heading" className="mt-16 sm:mt-20">
      <h2 id="colophon-heading" className="sr-only">
        Project details
      </h2>

      <StaggerItem as="div" direction="none" aria-hidden="true">
        <span className="block h-px w-full bg-border" />
      </StaggerItem>

      <div className="mt-8 flex flex-col gap-8 sm:pl-[5.5rem] lg:flex-row lg:gap-16">
        {hasTech ? (
          <StaggerItem className="flex-1">
            <p className="label-mono mb-4">Built with</p>
            <ul className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <li key={tech}>
                  <Badge>{tech}</Badge>
                </li>
              ))}
            </ul>
          </StaggerItem>
        ) : null}

        {hasLinks ? (
          <StaggerItem className="lg:w-64 lg:shrink-0">
            <p className="label-mono mb-4">Elsewhere</p>
            <ul className="flex flex-col gap-3">
              {liveUrl ? (
                <li>
                  <a href={liveUrl} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
                    <ExternalLink
                      aria-hidden="true"
                      className="size-4 shrink-0 text-fg-subtle group-hover:text-accent"
                    />
                    <span className="font-medium group-hover:underline">Live site</span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
              {githubUrl ? (
                <li>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={LINK_CLASS}
                  >
                    <Code2
                      aria-hidden="true"
                      className="size-4 shrink-0 text-fg-subtle group-hover:text-accent"
                    />
                    <span className="font-medium group-hover:underline">Source code</span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </StaggerItem>
        ) : null}
      </div>
    </Stagger>
  );
}
