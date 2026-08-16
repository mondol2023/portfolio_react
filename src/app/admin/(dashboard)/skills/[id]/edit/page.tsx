import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { SkillForm } from "@/components/admin/skill-form";
import { deleteSkillAction } from "@/lib/actions/skill-actions";
import { skillToInput } from "@/lib/admin/form-values";
import { getSkillById } from "@/lib/firebase/repositories/skills-repository";
import { SKILL_CATEGORY_LABELS } from "@/lib/types/content";

export const metadata = { title: "Edit technology" };

export default async function EditSkillPage({ params }: PageProps<"/admin/skills/[id]/edit">) {
  const { id } = await params;
  const skill = await getSkillById(id);

  if (!skill) notFound();

  return (
    <>
      <AdminPageHeader
        title={skill.name}
        description={SKILL_CATEGORY_LABELS[skill.category]}
        backHref="/admin/skills"
        backLabel="Tech stack"
        actions={
          <DeleteButton
            id={skill.id}
            action={deleteSkillAction}
            name={skill.name}
            entity="technology"
            successTitle="Technology deleted"
            redirectTo="/admin/skills"
          />
        }
      />

      <SkillForm skillId={skill.id} initialValues={skillToInput(skill)} />
    </>
  );
}
