import Link from "next/link";
import type { ReactNode } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Layout primitives shared by every admin form.
 *
 * Long forms are grouped into labelled `<fieldset>` cards so a project editor
 * with thirty inputs still reads as a handful of decisions, and so the grouping
 * is exposed to assistive technology rather than being purely visual.
 */

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn("rounded-card border border-border bg-surface p-5 sm:p-6", className)}>
      <legend className="px-1 text-sm font-semibold tracking-tight text-fg">{title}</legend>

      {description ? (
        <p className="mt-1 mb-5 text-xs leading-relaxed text-fg-subtle">{description}</p>
      ) : (
        <div className="mt-4" />
      )}

      <div className="flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}

/** Two columns from `sm` up, one below. */
export function FormRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

interface FormActionsProps {
  submitLabel: string;
  isSubmitting: boolean;
  cancelHref: string;
  /** Extra controls (e.g. Delete) pinned to the left of the save button. */
  children?: ReactNode;
}

export function FormActions({
  submitLabel,
  isSubmitting,
  cancelHref,
  children,
}: FormActionsProps) {
  return (
    <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-bg-subtle/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
      <Button type="submit" isLoading={isSubmitting} loadingLabel="Saving">
        {submitLabel}
      </Button>

      <Link href={cancelHref} className={buttonClasses("secondary", "md")}>
        Cancel
      </Link>

      {children ? <div className="ml-auto">{children}</div> : null}
    </div>
  );
}
