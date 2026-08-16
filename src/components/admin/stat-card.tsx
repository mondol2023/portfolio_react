import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Dashboard metric. Becomes a link when `href` is given so a count is also the
 * way in to the collection it counts.
 */
interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
}

export function StatCard({ label, value, hint, icon: Icon, href }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-fg-subtle">{hint}</p> : null}
    </>
  );

  const className = cn(
    "rounded-card border border-border bg-surface p-5",
    href &&
      "transition-colors hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  );

  if (href) {
    return (
      <Link href={href} className={cn("block", className)}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
