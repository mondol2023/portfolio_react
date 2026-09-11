"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ToggleField } from "@/components/ui/toggle-field";
// Optional feature. Removing it is: delete `src/features/repo-imagery`, this
// import, the three `useWatch` lines below, and the <RepoImageryPanel> block.
import { RepoImageryPanel } from "@/features/repo-imagery";
import {
  createProjectAction,
  updateProjectAction,
} from "@/lib/actions/project-actions";
import { projectDefaults, projectSchema, type ProjectInput } from "@/lib/validation/project-schema";

import { FormActions, FormRow, FormSection } from "./form-shell";
import { formResolver } from "./form-resolver";
import { StringListInput } from "./string-list-input";
import { useActionSubmit } from "./use-action-submit";

/**
 * Create/edit form for a project.
 *
 * One component for both modes: the fields, validation and layout are identical
 * and only the action called at the end differs, so splitting it would mean
 * maintaining thirty inputs twice.
 */

const PROJECT_TYPES = [
  "Web App",
  "Mobile App",
  "API",
  "Library",
  "CLI Tool",
  "Design System",
  "Other",
] as const;

/** Turns a title into a URL-safe slug matching the `slug` schema. */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface ProjectFormProps {
  /** Absent in create mode. */
  projectId?: string;
  initialValues?: ProjectInput;
}

export function ProjectForm({ projectId, initialValues }: ProjectFormProps) {
  const isEdit = Boolean(projectId);
  // Only meaningful while creating: once the author edits the slug by hand we
  // stop overwriting it from the title.
  const [slugLocked, setSlugLocked] = useState(isEdit);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: formResolver(projectSchema),
    defaultValues: initialValues ?? projectDefaults,
  });

  const submit = useActionSubmit<ProjectInput>(setError);

  // For the repo-imagery panel. `useWatch` rather than `watch()`: the latter
  // subscribes outside React's knowledge and is what the lint rule objects to.
  const githubUrl = useWatch({ control, name: "githubUrl" });
  const featuredImage = useWatch({ control, name: "featuredImage" });
  const gallery = useWatch({ control, name: "gallery" });

  const onSubmit = handleSubmit(async (values) => {
    await submit(
      () =>
        projectId
          ? updateProjectAction(projectId, values)
          : createProjectAction(values),
      {
        successTitle: isEdit ? "Project updated" : "Project created",
        successDescription: values.published
          ? "It is live on the public site."
          : "Saved as a draft — publish it when you're ready.",
        redirectTo: "/admin/projects",
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormSection
        title="Basics"
        description="Title, URL and the summary shown on project cards."
      >
        <FormRow>
          <Field label="Title" required error={errors.title?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("title", {
                  onChange: (event) => {
                    if (!slugLocked) {
                      setValue("slug", toSlug(event.target.value), {
                        shouldValidate: false,
                      });
                    }
                  },
                })}
                placeholder="Portfolio CMS"
              />
            )}
          </Field>

          <Field
            label="Slug"
            required
            error={errors.slug?.message}
            hint="The public URL: /projects/your-slug"
          >
            {(props) => (
              <Input
                {...props}
                {...register("slug", { onChange: () => setSlugLocked(true) })}
                placeholder="portfolio-cms"
                className="font-mono"
              />
            )}
          </Field>
        </FormRow>

        <Field
          label="Short description"
          required
          error={errors.shortDescription?.message}
          hint="One or two sentences. Used on cards and in search results."
        >
          {(props) => (
            <Textarea
              {...props}
              {...register("shortDescription")}
              rows={2}
              placeholder="What it is, in a sentence."
            />
          )}
        </Field>

        <Field
          label="Full description"
          required
          error={errors.fullDescription?.message}
          hint="Opens the case study. Blank lines start a new paragraph; lines beginning with - become a list."
        >
          {(props) => (
            <Textarea {...props} {...register("fullDescription")} rows={7} />
          )}
        </Field>

        <FormRow>
          <Field label="Project type" required error={errors.type?.message}>
            {(props) => (
              <Select {...props} {...register("type")}>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Order"
            required
            error={errors.order?.message}
            hint="Lower numbers appear first."
          >
            {(props) => (
              <Input {...props} {...register("order")} type="number" min={0} max={9999} />
            )}
          </Field>
        </FormRow>

        <Field
          label="Technologies"
          required
          error={errors.technologies?.message}
          hint="Press Enter after each one."
        >
          {(props) => (
            <Controller
              control={control}
              name="technologies"
              render={({ field }) => (
                <StringListInput
                  {...props}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Next.js, TypeScript, Firestore…"
                />
              )}
            />
          )}
        </Field>
      </FormSection>

      <FormSection
        title="Timeline"
        description="Leave the end date empty for work that is still ongoing."
      >
        <FormRow>
          <Field label="Start date" required error={errors.startDate?.message}>
            {(props) => <Input {...props} {...register("startDate")} type="date" />}
          </Field>

          <Field label="End date" error={errors.endDate?.message}>
            {(props) => <Input {...props} {...register("endDate")} type="date" />}
          </Field>
        </FormRow>
      </FormSection>

      <FormSection
        title="Case study"
        description="Every field is optional — a project shows only the chapters you fill in."
      >
        <Field label="Problem" error={errors.caseStudy?.problem?.message}>
          {(props) => (
            <Textarea
              {...props}
              {...register("caseStudy.problem")}
              rows={4}
              placeholder="What needed solving, and why it mattered."
            />
          )}
        </Field>

        <Field label="Solution" error={errors.caseStudy?.solution?.message}>
          {(props) => (
            <Textarea {...props} {...register("caseStudy.solution")} rows={4} />
          )}
        </Field>

        <Field
          label="Architecture & approach"
          error={errors.caseStudy?.approach?.message}
        >
          {(props) => (
            <Textarea {...props} {...register("caseStudy.approach")} rows={4} />
          )}
        </Field>

        <Field label="Challenges" error={errors.caseStudy?.challenges?.message}>
          {(props) => (
            <Textarea {...props} {...register("caseStudy.challenges")} rows={4} />
          )}
        </Field>

        <Field label="Results" error={errors.caseStudy?.results?.message}>
          {(props) => (
            <Textarea {...props} {...register("caseStudy.results")} rows={4} />
          )}
        </Field>
      </FormSection>

      <FormSection
        title="Media & links"
        description="Image hosts must be allow-listed in next.config.ts before they will load."
      >
        <Field
          label="Cover image URL"
          error={errors.featuredImage?.message}
          hint="Shown on cards and at the top of the case study. 16:9 works best."
        >
          {(props) => (
            <Input
              {...props}
              {...register("featuredImage")}
              type="url"
              inputMode="url"
              placeholder="https://…"
            />
          )}
        </Field>

        <Field label="Screenshot URLs" error={errors.gallery?.message}>
          {(props) => (
            <Controller
              control={control}
              name="gallery"
              render={({ field }) => (
                <StringListInput
                  {...props}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="https://… then Enter"
                  block
                />
              )}
            />
          )}
        </Field>

        <FormRow>
          <Field label="Live URL" error={errors.liveUrl?.message}>
            {(props) => (
              <Input {...props} {...register("liveUrl")} type="url" placeholder="https://…" />
            )}
          </Field>

          <Field label="Source code URL" error={errors.githubUrl?.message}>
            {(props) => (
              <Input {...props} {...register("githubUrl")} type="url" placeholder="https://…" />
            )}
          </Field>
        </FormRow>

        <RepoImageryPanel
          repoUrl={githubUrl ?? ""}
          featuredImage={featuredImage ?? ""}
          gallery={gallery ?? []}
          onUseCover={(url) =>
            setValue("featuredImage", url, { shouldValidate: true, shouldDirty: true })
          }
          onGalleryChange={(urls) =>
            setValue("gallery", urls, { shouldValidate: true, shouldDirty: true })
          }
        />
      </FormSection>

      <FormSection title="Visibility">
        <ToggleField
          {...register("published")}
          label="Published"
          description="Unpublished projects are hidden from every public page and return a 404 at their URL."
        />
        <ToggleField
          {...register("featured")}
          label="Featured"
          description="Featured projects lead the section on the home page."
        />
      </FormSection>

      <FormActions
        submitLabel={isEdit ? "Save changes" : "Create project"}
        isSubmitting={isSubmitting}
        cancelHref="/admin/projects"
      />
    </form>
  );
}
