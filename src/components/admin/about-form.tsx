"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { updateAboutAction } from "@/lib/actions/content-actions";
import { aboutSchema, type AboutInput } from "@/lib/validation/about-schema";

import { FormActions, FormSection } from "./form-shell";
import { formResolver } from "./form-resolver";
import { useActionSubmit } from "./use-action-submit";

/**
 * The About singleton.
 *
 * Statistics are free text on purpose — "3 yrs", "12+" and "Since 2019" are all
 * legitimate, and forcing a number would push authors into inventing precision
 * they do not have.
 */

const MAX_STATS = 4;

interface AboutFormProps {
  initialValues: AboutInput;
}

export function AboutForm({ initialValues }: AboutFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AboutInput>({
    resolver: formResolver(aboutSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "stats" });
  const submit = useActionSubmit<AboutInput>(setError);

  const onSubmit = handleSubmit(async (values) => {
    await submit(() => updateAboutAction(values), { successTitle: "About section saved" });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormSection
        title="Narrative"
        description="Blank lines start a new paragraph; lines beginning with - become a list."
      >
        <Field
          label="Introduction"
          required
          error={errors.introduction?.message}
          hint="The opening paragraph of the About section."
        >
          {(props) => <Textarea {...props} {...register("introduction")} rows={4} />}
        </Field>

        <Field
          label="Philosophy"
          required
          error={errors.philosophy?.message}
          hint="How you approach building software."
        >
          {(props) => <Textarea {...props} {...register("philosophy")} rows={4} />}
        </Field>

        <Field
          label="Summary"
          required
          error={errors.summary?.message}
          hint="A closing paragraph — what you're looking for, or what you do best."
        >
          {(props) => <Textarea {...props} {...register("summary")} rows={4} />}
        </Field>
      </FormSection>

      <FormSection
        title="Key statistics"
        description={`Up to ${MAX_STATS}. Leave this empty rather than publishing numbers you cannot stand behind.`}
      >
        {fields.length === 0 ? (
          <p className="text-sm text-fg-subtle">No statistics yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {fields.map((field, index) => (
              <li
                key={field.id}
                className="grid gap-4 rounded-lg border border-border bg-bg-subtle p-4 sm:grid-cols-[7rem_1fr_auto]"
              >
                <Field label="Value" required error={errors.stats?.[index]?.value?.message}>
                  {(props) => (
                    <Input {...props} {...register(`stats.${index}.value`)} placeholder="12+" />
                  )}
                </Field>

                <div className="flex flex-col gap-4">
                  <Field label="Label" required error={errors.stats?.[index]?.label?.message}>
                    {(props) => (
                      <Input
                        {...props}
                        {...register(`stats.${index}.label`)}
                        placeholder="Projects shipped"
                      />
                    )}
                  </Field>

                  <Field label="Detail" error={errors.stats?.[index]?.detail?.message}>
                    {(props) => (
                      <Input
                        {...props}
                        {...register(`stats.${index}.detail`)}
                        placeholder="Optional context"
                      />
                    )}
                  </Field>
                </div>

                <div className="flex sm:items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span className="sm:sr-only">Remove statistic {index + 1}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {fields.length < MAX_STATS ? (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => append({ label: "", value: "", detail: undefined })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add statistic
            </Button>
          </div>
        ) : null}
      </FormSection>

      <FormActions submitLabel="Save changes" isSubmitting={isSubmitting} cancelHref="/admin" />
    </form>
  );
}
