import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Small status/label pill. Used for tech tags, publish state and availability. */

export type BadgeVariant = "neutral" | "accent" | "success" | "danger" | "warning" | "outline";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-bg-subtle text-fg-muted border-border",
  accent: "bg-accent-subtle text-accent border-transparent",
  success: "bg-success-subtle text-success border-transparent",
  danger: "bg-danger-subtle text-danger border-transparent",
  warning: "bg-warning/10 text-warning border-transparent",
  outline: "bg-transparent text-fg-muted border-border-strong",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-xs font-medium whitespace-nowrap",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
