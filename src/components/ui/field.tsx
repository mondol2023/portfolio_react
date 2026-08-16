"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Label + control + hint + error, wired together.
 *
 * `<Field>` generates the ids and hands them to its child through a render
 * prop, so `htmlFor`, `aria-describedby` and `aria-invalid` can never drift
 * apart from the control they describe — the most common accessibility bug in
 * hand-written forms.
 */

export interface FieldRenderProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
}

interface FieldProps {
  label: string;
  /** Validation message. Its presence is what marks the control invalid. */
  error?: string;
  /** Static helper text shown below the control. */
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
}

export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-fg-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        // `role="alert"` so the message is announced the moment it appears.
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
