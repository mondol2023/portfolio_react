import type { VisitBreakdown } from "@/lib/types/analytics";

/**
 * Donut via `stroke-dasharray` on a circle whose circumference is exactly 100,
 * so each slice's dash length is its percentage.
 */

const RADIUS = 15.9155;

const COLORS = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "var(--fg-subtle)",
];

interface ShareDonutProps {
  items: VisitBreakdown[];
  emptyLabel?: string;
}

export function ShareDonut({ items, emptyLabel = "Nothing yet." }: ShareDonutProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <p className="text-sm text-fg-subtle">{emptyLabel}</p>;
  }

  let offset = 25; // Starts the first slice at twelve o'clock.
  const slices = items.map((item, index) => {
    const percent = (item.value / total) * 100;
    const slice = {
      ...item,
      percent,
      color: COLORS[index % COLORS.length] ?? "var(--accent)",
      dash: `${percent.toFixed(2)} ${(100 - percent).toFixed(2)}`,
      offset,
    };
    offset -= percent;
    return slice;
  });

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 42 42" className="size-28 shrink-0" role="img" aria-label="Share by device">
        <circle
          cx="21"
          cy="21"
          r={RADIUS}
          fill="none"
          stroke="var(--surface-hover)"
          strokeWidth="6"
        />
        {slices.map((slice) => (
          <circle
            key={slice.label}
            cx="21"
            cy="21"
            r={RADIUS}
            fill="none"
            stroke={slice.color}
            strokeWidth="6"
            strokeDasharray={slice.dash}
            strokeDashoffset={slice.offset}
          >
            <title>{`${slice.label} — ${slice.value} (${Math.round(slice.percent)}%)`}</title>
          </circle>
        ))}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate capitalize text-fg-muted">{slice.label}</span>
            <span className="shrink-0 tabular-nums text-fg-subtle">
              {Math.round(slice.percent)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
