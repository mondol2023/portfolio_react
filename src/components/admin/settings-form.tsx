"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { updateSiteSettingsAction } from "@/lib/actions/content-actions";
import { AVAILABILITY_STATUSES } from "@/lib/types/content";
import {
  siteSettingsSchema,
  type SiteSettingsInput,
} from "@/lib/validation/site-settings-schema";

import { FormActions, FormRow, FormSection } from "./form-shell";
import { formResolver } from "./form-resolver";
import { useActionSubmit } from "./use-action-submit";

/**
 * Site settings singleton.
 *
 * These values feed the hero, the footer, the contact section and every piece
 * of page metadata, so a save here revalidates the whole public site.
 */

const MAX_SOCIALS = 6;

const AVAILABILITY_LABELS: Record<(typeof AVAILABILITY_STATUSES)[number], string> = {
  available: "Available — actively looking",
  open: "Open to opportunities",
  unavailable: "Not available",
};

interface SettingsFormProps {
  initialValues: SiteSettingsInput;
}

export function SettingsForm({ initialValues }: SettingsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsInput>({
    resolver: formResolver(siteSettingsSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "otherSocials" });
  const submit = useActionSubmit<SiteSettingsInput>(setError);

  const onSubmit = handleSubmit(async (values) => {
    await submit(() => updateSiteSettingsAction(values), {
      successTitle: "Site settings saved",
      successDescription: "The public site has been refreshed.",
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormSection title="Identity" description="Used in the hero, the footer and page titles.">
        <FormRow>
          <Field label="Name" required error={errors.name?.message}>
            {(props) => <Input {...props} {...register("name")} autoComplete="name" />}
          </Field>

          <Field label="Professional title" required error={errors.title?.message}>
            {(props) => (
              <Input {...props} {...register("title")} placeholder="Senior Software Developer" />
            )}
          </Field>
        </FormRow>

        <Field
          label="Tagline"
          required
          error={errors.tagline?.message}
          hint="The positioning statement under your name in the hero."
        >
          {(props) => <Textarea {...props} {...register("tagline")} rows={2} />}
        </Field>

        <Field
          label="Description"
          required
          error={errors.description?.message}
          hint="A short paragraph. Doubles as the site's meta description and social preview text."
        >
          {(props) => <Textarea {...props} {...register("description")} rows={3} />}
        </Field>

        <FormRow>
          <Field label="Email" required error={errors.email?.message}>
            {(props) => (
              <Input {...props} {...register("email")} type="email" autoComplete="email" />
            )}
          </Field>

          <Field label="Location" error={errors.location?.message}>
            {(props) => (
              <Input {...props} {...register("location")} placeholder="City, Country" />
            )}
          </Field>
        </FormRow>

        <Field
          label="Phone"
          error={errors.phone?.message}
          hint="Not a link — type the number itself. It is never printed on the site: the contact section shows a call button instead, which dials it. Note that the number is still readable in the page source, so treat this as unlisted rather than private. Leave empty to hide the button."
        >
          {(props) => (
            <Input
              {...props}
              {...register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+880 1712-345678"
            />
          )}
        </Field>
      </FormSection>

      <FormSection
        title="Availability"
        description="Shown as a status pill in the hero and on the contact section."
      >
        <FormRow>
          <Field label="Status" required error={errors.availabilityStatus?.message}>
            {(props) => (
              <Select {...props} {...register("availabilityStatus")}>
                {AVAILABILITY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {AVAILABILITY_LABELS[status]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Label"
            required
            error={errors.availabilityLabel?.message}
            hint="The wording readers actually see."
          >
            {(props) => (
              <Input
                {...props}
                {...register("availabilityLabel")}
                placeholder="Available for new work"
              />
            )}
          </Field>
        </FormRow>
      </FormSection>

      <FormSection title="Links" description="Leave a field empty to hide that link entirely.">
        <FormRow>
          <Field label="GitHub" error={errors.github?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("github")}
                type="url"
                placeholder="https://github.com/…"
              />
            )}
          </Field>

          <Field label="LinkedIn" error={errors.linkedin?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("linkedin")}
                type="url"
                placeholder="https://linkedin.com/in/…"
              />
            )}
          </Field>
        </FormRow>

        <FormRow>
          <Field label="X / Twitter" error={errors.twitter?.message}>
            {(props) => (
              <Input {...props} {...register("twitter")} type="url" placeholder="https://x.com/…" />
            )}
          </Field>

          <Field
            label="Résumé URL"
            error={errors.resumeUrl?.message}
            hint="Adds a résumé button to the hero."
          >
            {(props) => (
              <Input {...props} {...register("resumeUrl")} type="url" placeholder="https://…" />
            )}
          </Field>
        </FormRow>
      </FormSection>

      <FormSection
        title="Other profiles"
        description={`Up to ${MAX_SOCIALS} extra links — Bluesky, a blog, Dribbble, anywhere else you publish.`}
      >
        {fields.length === 0 ? (
          <p className="text-sm text-fg-subtle">No additional profiles.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {fields.map((field, index) => (
              <li
                key={field.id}
                className="grid gap-4 rounded-lg border border-border bg-bg-subtle p-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]"
              >
                <Field
                  label="Label"
                  required
                  error={errors.otherSocials?.[index]?.label?.message}
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register(`otherSocials.${index}.label`)}
                      placeholder="Bluesky"
                    />
                  )}
                </Field>

                <Field label="URL" required error={errors.otherSocials?.[index]?.url?.message}>
                  {(props) => (
                    <Input
                      {...props}
                      {...register(`otherSocials.${index}.url`)}
                      type="url"
                      placeholder="https://…"
                    />
                  )}
                </Field>

                <div className="flex sm:items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span className="sm:sr-only">Remove profile {index + 1}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {fields.length < MAX_SOCIALS ? (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => append({ label: "", url: "" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add profile
            </Button>
          </div>
        ) : null}
      </FormSection>

      <FormActions submitLabel="Save settings" isSubmitting={isSubmitting} cancelHref="/admin" />
    </form>
  );
}
