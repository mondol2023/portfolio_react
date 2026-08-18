import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Shared card around every chart, so the grid stays even. */
interface ChartPanelProps {
  id: string;
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function ChartPanel({ id, title, hint, className, children }: ChartPanelProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn("rounded-card border border-border bg-surface", className)}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h3 id={id} className="text-sm font-semibold text-fg">
          {title}
        </h3>
        {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
