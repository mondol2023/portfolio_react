import { formatDayFull, formatDayShort } from "@/lib/analytics/period";
import type { DailyVisitStat } from "@/lib/types/analytics";

/**
 * Daily trend as plain server-rendered SVG: no chart library, no client JS,
 * native `<title>` tooltips. The viewBox stretches to the container, so nothing
 * inside is text and strokes are `non-scaling-stroke`.
 */

const WIDTH = 300;
const HEIGHT = 100;
const TOP = 6;
const BOTTOM = 94;

interface VisitsTrendChartProps {
  data: DailyVisitStat[];
}

function pointsFor(values: number[], max: number): string {
  const step = values.length > 1 ? WIDTH / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const y = BOTTOM - (value / max) * (BOTTOM - TOP);
      return `${(index * step).toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function VisitsTrendChart({ data }: VisitsTrendChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-fg-subtle">No visits recorded yet.</p>;
  }

  // A floor of 1 keeps an all-zero window from dividing by zero.
  const max = Math.max(1, ...data.map((entry) => entry.visits));
  const visits = pointsFor(
    data.map((entry) => entry.visits),
    max,
  );
  const uniques = pointsFor(
    data.map((entry) => entry.uniques),
    max,
  );
  const columnWidth = WIDTH / data.length;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-44 w-full overflow-visible"
        role="img"
        aria-label={`Visits per day over the last ${data.length} days`}
      >
        <defs>
          <linearGradient id="visit-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((fraction) => {
          const y = TOP + fraction * (BOTTOM - TOP);
          return (
            <line
              key={fraction}
              x1="0"
              x2={WIDTH}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        <polygon points={`0,${BOTTOM} ${visits} ${WIDTH},${BOTTOM}`} fill="url(#visit-area)" />
        <polyline
          points={visits}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={uniques}
          fill="none"
          stroke="var(--fg-subtle)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Invisible columns give every day a native hover tooltip. */}
        {data.map((entry, index) => (
          <rect
            key={entry.day}
            x={index * columnWidth}
            y="0"
            width={columnWidth}
            height={HEIGHT}
            fill="transparent"
          >
            <title>{`${formatDayFull(entry.day)} — ${entry.visits} visits, ${entry.uniques} unique`}</title>
          </rect>
        ))}
      </svg>

      <figcaption className="mt-3 flex items-center justify-between text-xs text-fg-subtle">
        <span>{formatDayShort(data[0]?.day ?? "")}</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-accent" aria-hidden="true" />
            Visits
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full bg-fg-subtle opacity-60"
              aria-hidden="true"
            />
            Unique
          </span>
        </span>
        <span>{formatDayShort(data[data.length - 1]?.day ?? "")}</span>
      </figcaption>
    </figure>
  );
}
