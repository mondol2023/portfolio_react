import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ExperienceForm } from "@/components/admin/experience-form";
import { getExperiences } from "@/lib/firebase/repositories/experience-repository";
import { experienceDefaults } from "@/lib/validation/experience-schema";

export const metadata = { title: "Add role" };

export default async function NewExperiencePage() {
  const experiences = await getExperiences();
  const nextOrder = experiences.reduce((max, role) => Math.max(max, role.order + 1), 0);

  return (
    <>
      <AdminPageHeader
        title="Add role"
        description="Describe what the role involved. Responsibilities read better as short, concrete lines."
        backHref="/admin/experience"
        backLabel="Experience"
      />

      <ExperienceForm initialValues={{ ...experienceDefaults, order: nextOrder }} />
    </>
  );
}
