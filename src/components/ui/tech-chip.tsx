import { TechTile } from "@/components/ui/tech-tile";
import { cn } from "@/lib/utils/cn";

/**
 * A technology named with its logo.
 *
 * The text badge says what was used; the chip shows it. Same information, but a
 * row of marks is scannable in a way a row of words is not — which is the point
 * under an experience entry, where the stack is the last thing read and the
 * first thing looked for.
 *
 * Mono uppercase keeps a mixed row ("Next.js", "PostgreSQL", "AWS") visually
 * even, so the logos line up instead of the words fighting for attention.
 */

export function TechChip({
  name,
  iconUrl,
  className,
}: {
  name: string;
  iconUrl?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pr-3 pl-1.5",
        "transition-colors duration-200 hover:border-tone",
        className,
      )}
    >
      <TechTile name={name} iconUrl={iconUrl} size="sm" />
      <span className="font-mono text-[0.6875rem] tracking-[0.12em] whitespace-nowrap text-fg-muted uppercase">
        {name}
      </span>
    </span>
  );
}
