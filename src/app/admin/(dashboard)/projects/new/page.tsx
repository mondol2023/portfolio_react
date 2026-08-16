import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProjectForm } from "@/components/admin/project-form";
import { getAllProjects } from "@/lib/firebase/repositories/projects-repository";
import { projectDefaults } from "@/lib/validation/project-schema";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  // Land the new project at the end of the list rather than colliding with
  // whatever already sits at position 0.
  const projects = await getAllProjects();
  const nextOrder = projects.reduce((max, project) => Math.max(max, project.order + 1), 0);

  return (
    <>
      <AdminPageHeader
        title="New project"
        description="Only the basics are required — the case study can be filled in later."
        backHref="/admin/projects"
        backLabel="Projects"
      />

      <ProjectForm initialValues={{ ...projectDefaults, order: nextOrder }} />
    </>
  );
}
