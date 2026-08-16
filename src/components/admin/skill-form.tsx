"use client";

import { useForm } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ToggleField } from "@/components/ui/toggle-field";
import { createSkillAction, updateSkillAction } from "@/lib/actions/skill-actions";
import {
  PROFICIENCY_LABELS,
  PROFICIENCY_LEVELS,
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
} from "@/lib/types/content";
import { skillDefaults, skillSchema, type SkillInput } from "@/lib/validation/skill-schema";

import { FormActions, FormRow, FormSection } from "./form-shell";
import { formResolver } from "./form-resolver";
import { useActionSubmit } from "./use-action-submit";

/**
 * Create/edit form for one technology.
 *
 * Proficiency is an optional named level, never a percentage: a "React 87%" bar
 * communicates nothing measurable and invites scepticism, whereas "Daily
 * driver" is a claim a reader can evaluate.
 */

interface SkillFormProps {
  skillId?: string;
  initialValues?: SkillInput;
}

export function SkillForm({ skillId, initialValues }: SkillFormProps) {
  const isEdit = Boolean(skillId);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SkillInput>({
    resolver: formResolver(skillSchema),
    defaultValues: initialValues ?? skillDefaults,
  });

  const submit = useActionSubmit<SkillInput>(setError);

  const onSubmit = handleSubmit(async (values) => {
    await submit(
      () => (skillId ? updateSkillAction(skillId, values) : createSkillAction(values)),
      {
        successTitle: isEdit ? "Technology updated" : "Technology added",
        redirectTo: "/admin/skills",
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormSection title="Technology">
        <FormRow>
          <Field label="Name" required error={errors.name?.message}>
            {(props) => <Input {...props} {...register("name")} placeholder="TypeScript" />}
          </Field>

          <Field label="Category" required error={errors.category?.message}>
            {(props) => (
              <Select {...props} {...register("category")}>
                {SKILL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {SKILL_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FormRow>

        <FormRow>
          <Field
            label="Proficiency"
            error={errors.proficiency?.message}
            hint="Optional. A named level, shown as a label rather than a bar."
          >
            {(props) => (
              <Select {...props} {...register("proficiency")}>
                <option value="">Not shown</option>
                {PROFICIENCY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {PROFICIENCY_LABELS[level]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Order"
            required
            error={errors.order?.message}
            hint="Position within its category."
          >
            {(props) => (
              <Input {...props} {...register("order")} type="number" min={0} max={9999} />
            )}
          </Field>
        </FormRow>

        <Field
          label="Description"
          error={errors.description?.message}
          hint="Optional. One line on how you use it."
        >
          {(props) => <Textarea {...props} {...register("description")} rows={2} />}
        </Field>

        <Field
          label="Icon URL"
          error={errors.iconUrl?.message}
          hint="Optional. Falls back to a monogram when empty."
        >
          {(props) => (
            <Input {...props} {...register("iconUrl")} type="url" placeholder="https://…" />
          )}
        </Field>
      </FormSection>

      <FormSection title="Visibility">
        <ToggleField
          {...register("enabled")}
          label="Enabled"
          description="Disabled technologies stay in the CMS but are hidden from the public tech stack."
        />
      </FormSection>

      <FormActions
        submitLabel={isEdit ? "Save changes" : "Add technology"}
        isSubmitting={isSubmitting}
        cancelHref="/admin/skills"
      />
    </form>
  );
}
