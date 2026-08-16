"use client";

import { Controller, useForm } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ToggleField } from "@/components/ui/toggle-field";
import {
  createExperienceAction,
  updateExperienceAction,
} from "@/lib/actions/experience-actions";
import { EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPES } from "@/lib/types/content";
import {
  experienceDefaults,
  experienceSchema,
  type ExperienceInput,
} from "@/lib/validation/experience-schema";

import { FormActions, FormRow, FormSection } from "./form-shell";
import { formResolver } from "./form-resolver";
import { StringListInput } from "./string-list-input";
import { useActionSubmit } from "./use-action-submit";

/** Create/edit form for one role in the experience timeline. */

interface ExperienceFormProps {
  experienceId?: string;
  initialValues?: ExperienceInput;
}

export function ExperienceForm({ experienceId, initialValues }: ExperienceFormProps) {
  const isEdit = Boolean(experienceId);

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExperienceInput>({
    resolver: formResolver(experienceSchema),
    defaultValues: initialValues ?? experienceDefaults,
  });

  const submit = useActionSubmit<ExperienceInput>(setError);
  // A current role has no end date; disabling the input says so before the
  // schema has to reject it.
  const isCurrent = watch("isCurrent");

  const onSubmit = handleSubmit(async (values) => {
    await submit(
      () =>
        experienceId
          ? updateExperienceAction(experienceId, values)
          : createExperienceAction(values),
      {
        successTitle: isEdit ? "Role updated" : "Role added",
        redirectTo: "/admin/experience",
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormSection title="Role">
        <FormRow>
          <Field label="Company" required error={errors.company?.message}>
            {(props) => <Input {...props} {...register("company")} placeholder="Company name" />}
          </Field>

          <Field label="Position" required error={errors.position?.message}>
            {(props) => (
              <Input {...props} {...register("position")} placeholder="Senior Software Engineer" />
            )}
          </Field>
        </FormRow>

        <FormRow>
          <Field label="Employment type" required error={errors.employmentType?.message}>
            {(props) => (
              <Select {...props} {...register("employmentType")}>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EMPLOYMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Location"
            required
            error={errors.location?.message}
            hint="City, country — or Remote."
          >
            {(props) => <Input {...props} {...register("location")} placeholder="Remote" />}
          </Field>
        </FormRow>

        <Field label="Company URL" error={errors.companyUrl?.message}>
          {(props) => (
            <Input {...props} {...register("companyUrl")} type="url" placeholder="https://…" />
          )}
        </Field>
      </FormSection>

      <FormSection title="Dates">
        <ToggleField
          {...register("isCurrent")}
          label="This is my current role"
          description="Shown as “Present” on the timeline."
        />

        <FormRow>
          <Field label="Start date" required error={errors.startDate?.message}>
            {(props) => <Input {...props} {...register("startDate")} type="date" />}
          </Field>

          <Field
            label="End date"
            error={errors.endDate?.message}
            hint={isCurrent ? "Not applicable to a current role." : undefined}
          >
            {(props) => (
              <Input {...props} {...register("endDate")} type="date" disabled={isCurrent} />
            )}
          </Field>
        </FormRow>
      </FormSection>

      <FormSection title="Details">
        <Field
          label="Description"
          required
          error={errors.description?.message}
          hint="A short paragraph about the role and the team."
        >
          {(props) => <Textarea {...props} {...register("description")} rows={4} />}
        </Field>

        <Field
          label="Responsibilities"
          error={errors.responsibilities?.message}
          hint="One per entry. Press Enter after each."
        >
          {(props) => (
            <Controller
              control={control}
              name="responsibilities"
              render={({ field }) => (
                <StringListInput
                  {...props}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Led the migration to…"
                  block
                />
              )}
            />
          )}
        </Field>

        <Field label="Technologies" error={errors.technologies?.message}>
          {(props) => (
            <Controller
              control={control}
              name="technologies"
              render={({ field }) => (
                <StringListInput
                  {...props}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="TypeScript, PostgreSQL…"
                />
              )}
            />
          )}
        </Field>

        <Field
          label="Order"
          required
          error={errors.order?.message}
          hint="Lower numbers appear first on the timeline."
        >
          {(props) => (
            <Input
              {...props}
              {...register("order")}
              type="number"
              min={0}
              max={9999}
              className="max-w-32"
            />
          )}
        </Field>
      </FormSection>

      <FormActions
        submitLabel={isEdit ? "Save changes" : "Add role"}
        isSubmitting={isSubmitting}
        cancelHref="/admin/experience"
      />
    </form>
  );
}
