"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * One channel of the transmission form.
 *
 * Same contract as `ui/field.tsx` — ids generated here and handed to the child
 * through a render prop, so `htmlFor` / `aria-describedby` / `aria-invalid` can
 * never drift from the control they describe — restyled as a terminal channel:
 * a numbered label that lifts out of the control when it is engaged, and a rule
 * underneath that draws itself in the section tone on focus.
 *
 * Focus is read with `onFocusCapture` / `onBlurCapture` on the wrapper rather
 * than by handing handlers to the control. React Hook Form's `register` already
 * owns the control's `onChange` and `onBlur`; composing with it invites the
 * kind of bug where a field silently stops validating because one spread
 * overwrote another.
 */

export interface TransmissionFieldRenderProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
}

interface TransmissionFieldProps {
  /** Channel number shown beside the label, 1-based. */
  index: number;
  label: string;
  /** True once the control holds anything — keeps the label lifted on blur. */
  filled: boolean;
  error?: string;
  hint?: string;
  children: (props: TransmissionFieldRenderProps) => ReactNode;
  className?: string;
}

export function TransmissionField({
  index,
  label,
  filled,
  error,
  hint,
  children,
  className,
}: TransmissionFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [focused, setFocused] = useState(false);

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const engaged = focused || filled;

  return (
    <div
      className={cn("group relative", className)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={cn(
            "flex items-baseline gap-2 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-200",
            error ? "text-danger" : engaged ? "text-tone" : "text-fg-subtle",
          )}
        >
          <span className="tabular-nums opacity-60">
            {String(index).padStart(2, "0")}
          </span>
          {label}
        </label>

        {/* A channel that has something in it says so, so the reader can see
            how much of the form is done without re-reading every control. */}
        <AnimatePresence initial={false}>
          {filled && !error ? (
            <motion.span
              key="ok"
              aria-hidden="true"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-mono text-[10px] tracking-[0.2em] text-tone uppercase"
            >
              OK
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="relative mt-2">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
        })}

        {/* The focus rule. Scaled from the centre rather than animated on
            `width`, so it never lays the control out again mid-keystroke. */}
        <motion.span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 -bottom-px h-px origin-center",
            error ? "bg-danger" : "bg-tone",
          )}
          initial={false}
          animate={{ scaleX: engaged ? 1 : 0, opacity: engaged ? 1 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {hint ? (
        <p id={hintId} className="mt-2 text-xs leading-relaxed text-fg-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
