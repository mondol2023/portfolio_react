import Link from "next/link";
import {
  Briefcase,
  FolderKanban,
  Inbox,
  Layers,
  Plus,
  SquarePen,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getExperiences } from "@/lib/firebase/repositories/experience-repository";
import { getMessages, getUnreadMessageCount } from "@/lib/firebase/repositories/messages-repository";
import { getAllProjects } from "@/lib/firebase/repositories/projects-repository";
import { getAllSkills } from "@/lib/firebase/repositories/skills-repository";
import { formatFullDate } from "@/lib/utils/dates";

/**
 * CMS dashboard: what exists, what is live, and what arrived while you were
 * away — each number linking to the collection it counts.
 */

export const metadata = { title: "Dashboard" };

const RECENT_LIMIT = 5;

export default async function AdminDashboardPage() {
  const [projects, experiences, skills, messages, unreadCount] = await Promise.all([
    getAllProjects(),
    getExperiences(),
    getAllSkills(),
    getMessages(RECENT_LIMIT),
    getUnreadMessageCount(),
  ]);

  const publishedCount = projects.filter((project) => project.published).length;
  const enabledSkills = skills.filter((skill) => skill.enabled).length;
  const recentProjects = projects.slice(0, RECENT_LIMIT);

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="An overview of everything the public site is currently serving."
        actions={
          <ButtonLink href="/admin/projects/new" variant="primary">
            <Plus className="size-4" aria-hidden="true" />
            New project
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Projects"
          value={projects.length}
          hint={`${publishedCount} published · ${projects.length - publishedCount} draft`}
          icon={FolderKanban}
          href="/admin/projects"
        />
        <StatCard
          label="Experience"
          value={experiences.length}
          hint={`${experiences.filter((role) => role.isCurrent).length} marked as current`}
          icon={Briefcase}
          href="/admin/experience"
        />
        <StatCard
          label="Technologies"
          value={skills.length}
          hint={`${enabledSkills} shown in the tech stack`}
          icon={Layers}
          href="/admin/skills"
        />
        <StatCard
          label="Unread messages"
          value={unreadCount}
          hint={unreadCount > 0 ? "Waiting for a reply" : "Inbox clear"}
          icon={Inbox}
          href="/admin/messages"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="recent-projects"
          className="rounded-card border border-border bg-surface"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <h2 id="recent-projects" className="text-sm font-semibold text-fg">
              Recent projects
            </h2>
            <Link
              href="/admin/projects"
              className="text-xs font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              View all
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Case studies are the centre of the portfolio. Add the first one."
                action={
                  <ButtonLink href="/admin/projects/new" variant="secondary" size="sm">
                    Add a project
                  </ButtonLink>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/admin/projects/${project.id}/edit`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">
                        {project.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                        {project.type}
                        {project.updatedAt
                          ? ` · updated ${formatFullDate(project.updatedAt)}`
                          : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {project.featured ? <Badge variant="accent">Featured</Badge> : null}
                      <Badge variant={project.published ? "success" : "neutral"}>
                        {project.published ? "Live" : "Draft"}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="recent-messages"
          className="rounded-card border border-border bg-surface"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <h2 id="recent-messages" className="text-sm font-semibold text-fg">
              Recent messages
            </h2>
            <Link
              href="/admin/messages"
              className="text-xs font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              View all
            </Link>
          </div>

          {messages.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Inbox}
                title="No messages yet"
                description="Anything submitted through the contact form lands here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((message) => (
                <li key={message.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-fg">
                      {message.subject}
                    </p>
                    {message.read ? null : <Badge variant="accent">New</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-fg-subtle">
                    {message.name} · {formatFullDate(message.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="quick-edits" className="mt-8">
        <h2 id="quick-edits" className="text-sm font-semibold text-fg">
          Site content
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/admin/about" variant="secondary" size="sm">
            <SquarePen className="size-4" aria-hidden="true" />
            Edit About
          </ButtonLink>
          <ButtonLink href="/admin/settings" variant="secondary" size="sm">
            <SquarePen className="size-4" aria-hidden="true" />
            Edit site settings
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
