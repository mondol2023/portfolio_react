import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SkillForm } from "@/components/admin/skill-form";
import { getAllSkills } from "@/lib/firebase/repositories/skills-repository";
import { skillDefaults } from "@/lib/validation/skill-schema";

export const metadata = { title: "Add technology" };

export default async function NewSkillPage() {
  const skills = await getAllSkills();
  const nextOrder = skills.reduce((max, skill) => Math.max(max, skill.order + 1), 0);

  return (
    <>
      <AdminPageHeader
        title="Add technology"
        description="Order is relative to the other entries in the same category."
        backHref="/admin/skills"
        backLabel="Tech stack"
      />

      <SkillForm initialValues={{ ...skillDefaults, order: nextOrder }} />
    </>
  );
}
