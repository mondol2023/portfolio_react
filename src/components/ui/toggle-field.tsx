"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Boolean control for flags like published / featured / enabled.
 *
 * It is a real `<input type="checkbox">` with the native box visually replaced
 * — so keyboard toggling, form submission and screen-reader semantics come for
 * free. `forwardRef` is required for react-hook-form's `register()`.
 */

interface ToggleFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

export const ToggleField = forwardRef<HTMLInputElement, ToggleFieldProps>(
  function ToggleField({ label, description, className, ...props }, ref) {
    const id = useId();
    const descriptionId = `${id}-description`;

    return (
      <div className={cn("flex items-start gap-3", className)}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-describedby={description ? descriptionId : undefined}
          className="peer toggle-input sr-only"
          {...props}
        />

        <label
          htmlFor={id}
          className={cn(
            "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
            "border border-border-strong bg-bg-subtle transition-colors duration-200",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
          )}
        >
          {/*
            The knob sits inside the label, so Tailwind's `peer-checked:` cannot
            reach it (that variant only matches siblings). `.toggle-knob` in
            globals.css handles the travel.
          */}
          <span
            aria-hidden="true"
            className="toggle-knob pointer-events-none ml-0.5 size-4.5 rounded-full bg-surface shadow-sm"
          />
          <span className="sr-only">{label}</span>
        </label>

        <div className="min-w-0">
          <label htmlFor={id} className="cursor-pointer text-sm font-medium text-fg">
            {label}
          </label>
          {description ? (
            <p id={descriptionId} className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
);
