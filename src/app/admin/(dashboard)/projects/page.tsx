import Link from "next/link";
import { ExternalLink, FolderKanban, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ReorderControls } from "@/components/admin/reorder-controls";
import { ToggleActionButton } from "@/components/admin/toggle-action-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteProjectAction,
  reorderProjectsAction,
  setProjectFeaturedAction,
  setProjectPublishedAction,
} from "@/lib/actions/project-actions";
import { getAllProjects } from "@/lib/firebase/repositories/projects-repository";
import { formatYearRange } from "@/lib/utils/dates";

export const metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const projects = await getAllProjects();
  const ids = projects.map((project) => project.id);

  return (
    <>
      <AdminPageHeader
        title="Projects"
        description="Drafts stay private until you publish them. Order controls where each one appears in the list."
        actions={
          <ButtonLink href="/admin/projects/new" variant="primary">
            <Plus className="size-4" aria-hidden="true" />
            New project
          </ButtonLink>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="A portfolio without case studies is a business card. Add your first project to get started."
          action={
            <ButtonLink href="/admin/projects/new" variant="primary">
              Add a project
            </ButtonLink>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project, index) => (
            <li
              key={project.id}
              className="rounded-card border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/projects/${project.id}/edit`}
                      className="text-base font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {project.title}
                    </Link>
                    {project.featured ? <Badge variant="accent">Featured</Badge> : null}
                    <Badge variant={project.published ? "success" : "neutral"}>
                      {project.published ? "Live" : "Draft"}
                    </Badge>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-sm text-fg-muted">
                    {project.shortDescription}
                  </p>

                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-fg-subtle">
                    <span>/projects/{project.slug}</span>
                    <span aria-hidden="true">·</span>
                    <span>{project.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatYearRange(project.startDate, project.endDate)}</span>
                  </p>
                </div>

                <ReorderControls
                  ids={ids}
                  index={index}
                  action={reorderProjectsAction}
                  name={project.title}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                <ButtonLink href={`/admin/projects/${project.id}/edit`} variant="ghost" size="sm">
                  Edit
                </ButtonLink>

                <ToggleActionButton
                  id={project.id}
                  value={project.published}
                  action={setProjectPublishedAction}
                  labelOn="Unpublish"
                  labelOff="Publish"
                  successTitleOn="Project published"
                  successTitleOff="Project unpublished"
                />

                <ToggleActionButton
                  id={project.id}
                  value={project.featured}
                  action={setProjectFeaturedAction}
                  labelOn="Unfeature"
                  labelOff="Feature"
                  successTitleOn="Project featured"
                  successTitleOff="Project unfeatured"
                />

                {project.published ? (
                  <ButtonLink
                    href={`/projects/${project.slug}`}
                    variant="ghost"
                    size="sm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </ButtonLink>
                ) : null}

                <div className="ml-auto">
                  <DeleteButton
                    id={project.id}
                    action={deleteProjectAction}
                    name={project.title}
                    entity="project"
                    successTitle="Project deleted"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
