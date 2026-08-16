import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ReorderControls } from "@/components/admin/reorder-controls";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteExperienceAction,
  reorderExperiencesAction,
} from "@/lib/actions/experience-actions";
import { getExperiences } from "@/lib/firebase/repositories/experience-repository";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/types/content";
import { formatDateRange } from "@/lib/utils/dates";

export const metadata = { title: "Experience" };

export default async function AdminExperiencePage() {
  const experiences = await getExperiences();
  const ids = experiences.map((experience) => experience.id);

  return (
    <>
      <AdminPageHeader
        title="Experience"
        description="The timeline runs top to bottom in this order — usually most recent first."
        actions={
          <ButtonLink href="/admin/experience/new" variant="primary">
            <Plus className="size-4" aria-hidden="true" />
            Add role
          </ButtonLink>
        }
      />

      {experiences.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No roles yet"
          description="Add the positions you want to show on the experience timeline."
          action={
            <ButtonLink href="/admin/experience/new" variant="primary">
              Add a role
            </ButtonLink>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {experiences.map((experience, index) => (
            <li
              key={experience.id}
              className="rounded-card border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/experience/${experience.id}/edit`}
                      className="text-base font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {experience.position}
                    </Link>
                    {experience.isCurrent ? <Badge variant="success">Current</Badge> : null}
                  </div>

                  <p className="mt-1 text-sm text-fg-muted">
                    {experience.company} · {experience.location}
                  </p>

                  <p className="mt-2 flex flex-wrap items-center gap-x-2 font-mono text-xs text-fg-subtle">
                    <span>{formatDateRange(experience.startDate, experience.endDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{EMPLOYMENT_TYPE_LABELS[experience.employmentType]}</span>
                  </p>
                </div>

                <ReorderControls
                  ids={ids}
                  index={index}
                  action={reorderExperiencesAction}
                  name={experience.position}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                <ButtonLink
                  href={`/admin/experience/${experience.id}/edit`}
                  variant="ghost"
                  size="sm"
                >
                  Edit
                </ButtonLink>

                <div className="ml-auto">
                  <DeleteButton
                    id={experience.id}
                    action={deleteExperienceAction}
                    name={`${experience.position} at ${experience.company}`}
                    entity="role"
                    successTitle="Role deleted"
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
