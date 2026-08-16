import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ExperienceForm } from "@/components/admin/experience-form";
import { deleteExperienceAction } from "@/lib/actions/experience-actions";
import { experienceToInput } from "@/lib/admin/form-values";
import { getExperienceById } from "@/lib/firebase/repositories/experience-repository";

export const metadata = { title: "Edit role" };

export default async function EditExperiencePage({
  params,
}: PageProps<"/admin/experience/[id]/edit">) {
  const { id } = await params;
  const experience = await getExperienceById(id);

  if (!experience) notFound();

  return (
    <>
      <AdminPageHeader
        title={experience.position}
        description={experience.company}
        backHref="/admin/experience"
        backLabel="Experience"
        actions={
          <DeleteButton
            id={experience.id}
            action={deleteExperienceAction}
            name={`${experience.position} at ${experience.company}`}
            entity="role"
            successTitle="Role deleted"
            redirectTo="/admin/experience"
          />
        }
      />

      <ExperienceForm
        experienceId={experience.id}
        initialValues={experienceToInput(experience)}
      />
    </>
  );
}
