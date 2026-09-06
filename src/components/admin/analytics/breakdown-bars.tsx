import type { VisitBreakdown } from "@/lib/types/analytics";

/** Ranked list with a proportional bar behind each row. Pure CSS. */
interface BreakdownBarsProps {
  items: VisitBreakdown[];
  emptyLabel?: string;
}

export function BreakdownBars({ items, emptyLabel = "Nothing yet." }: BreakdownBarsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-fg-subtle">{emptyLabel}</p>;
  }

  const max = Math.max(1, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-fg-muted" title={item.label}>
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-fg-subtle">
                {item.value} · {share}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
