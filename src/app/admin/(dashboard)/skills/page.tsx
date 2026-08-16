import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ReorderControls } from "@/components/admin/reorder-controls";
import { ToggleActionButton } from "@/components/admin/toggle-action-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteSkillAction,
  reorderSkillsAction,
  setSkillEnabledAction,
} from "@/lib/actions/skill-actions";
import { getAllSkills } from "@/lib/firebase/repositories/skills-repository";
import {
  PROFICIENCY_LABELS,
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
  type Skill,
} from "@/lib/types/content";

export const metadata = { title: "Tech stack" };

export default async function AdminSkillsPage() {
  const skills = await getAllSkills();

  // Grouped for editing the same way the public section is grouped, so the
  // order controls act on exactly the list the visitor will see.
  const grouped = SKILL_CATEGORIES.map((category) => ({
    category,
    items: skills.filter((skill) => skill.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <AdminPageHeader
        title="Tech stack"
        description="Grouped by category. Disabled technologies stay here but disappear from the public site."
        actions={
          <ButtonLink href="/admin/skills/new" variant="primary">
            <Plus className="size-4" aria-hidden="true" />
            Add technology
          </ButtonLink>
        }
      />

      {grouped.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No technologies yet"
          description="Add the languages, frameworks and tools you actually work with."
          action={
            <ButtonLink href="/admin/skills/new" variant="primary">
              Add a technology
            </ButtonLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map((group) => (
            <section key={group.category} aria-labelledby={`category-${group.category}`}>
              <h2
                id={`category-${group.category}`}
                className="label-mono mb-3 text-fg-subtle"
              >
                {SKILL_CATEGORY_LABELS[group.category]}
              </h2>

              <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
                {group.items.map((skill, index) => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    index={index}
                    ids={group.items.map((item) => item.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function SkillRow({ skill, index, ids }: { skill: Skill; index: number; ids: string[] }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/skills/${skill.id}/edit`}
            className="text-sm font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {skill.name}
          </Link>
          {skill.proficiency ? (
            <Badge variant="outline">{PROFICIENCY_LABELS[skill.proficiency]}</Badge>
          ) : null}
          {skill.enabled ? null : <Badge variant="neutral">Hidden</Badge>}
        </div>
        {skill.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-fg-subtle">{skill.description}</p>
        ) : null}
      </div>

      <ReorderControls
        ids={ids}
        index={index}
        action={reorderSkillsAction}
        name={skill.name}
      />

      <ToggleActionButton
        id={skill.id}
        value={skill.enabled}
        action={setSkillEnabledAction}
        labelOn="Hide"
        labelOff="Show"
        successTitleOn="Technology shown"
        successTitleOff="Technology hidden"
      />

      <DeleteButton
        id={skill.id}
        action={deleteSkillAction}
        name={skill.name}
        entity="technology"
        successTitle="Technology deleted"
      />
    </li>
  );
}
