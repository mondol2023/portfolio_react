import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Shown when a collection is legitimately empty — a fresh install with no
 * content yet, or a filter with no matches. Distinct from an error: nothing
 * went wrong, there is simply nothing here.
 */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Usually a button that starts the "add the first one" flow. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed",
        "border-border-strong bg-bg-subtle/50 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-fg-subtle">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}

      <p className="text-base font-medium text-fg">{title}</p>

      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
