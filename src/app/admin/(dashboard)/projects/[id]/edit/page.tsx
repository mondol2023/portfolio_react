import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ProjectForm } from "@/components/admin/project-form";
import { deleteProjectAction } from "@/lib/actions/project-actions";
import { projectToInput } from "@/lib/admin/form-values";
import { getProjectById } from "@/lib/firebase/repositories/projects-repository";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: PageProps<"/admin/projects/[id]/edit">) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) notFound();

  return (
    <>
      <AdminPageHeader
        title={project.title}
        description={`/projects/${project.slug}`}
        backHref="/admin/projects"
        backLabel="Projects"
        actions={
          <DeleteButton
            id={project.id}
            action={deleteProjectAction}
            name={project.title}
            entity="project"
            successTitle="Project deleted"
            redirectTo="/admin/projects"
          />
        }
      />

      <ProjectForm projectId={project.id} initialValues={projectToInput(project)} />
    </>
  );
}
