import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Form controls. All three share one visual signature so a form never looks
 * assembled from parts, and all three colour their border from `aria-invalid`
 * rather than a separate `error` prop — the state lives in one place.
 */

const CONTROL =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg " +
  "placeholder:text-fg-subtle transition-colors duration-150 " +
  "hover:border-border-strong " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/30";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, rows = 5, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(CONTROL, "resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "cursor-pointer pr-9", className)} {...props}>
      {children}
    </select>
  );
}
