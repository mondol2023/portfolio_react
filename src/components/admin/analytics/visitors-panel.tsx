import { Eye, Globe2, Sunrise, Users } from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { matchesVisit, type VisitSearchField } from "@/lib/analytics/search";
import {
  TREND_DAYS,
  VISIT_SCAN_LIMIT,
  getRecentVisits,
  getVisitorAnalytics,
} from "@/lib/firebase/repositories/analytics-repository";
import { getMessages } from "@/lib/firebase/repositories/messages-repository";
import type { ContactMessage } from "@/lib/types/content";
import type { VisitRow } from "@/lib/types/analytics";

import { BreakdownBars } from "./breakdown-bars";
import { ChartPanel } from "./chart-panel";
import { ShareDonut } from "./share-donut";
import { VisitsTrendChart } from "./visits-trend-chart";
import { VisitorSearch } from "./visitor-search";
import { VisitorTable } from "./visitor-table";

/**
 * Visitor analytics section of the dashboard: counters, charts and the
 * searchable visit log.
 */

/** Messages scanned for the visitor link. */
const MESSAGE_SCAN_LIMIT = 200;

/** Rows rendered after filtering. */
const ROW_LIMIT = 50;

interface VisitorsPanelProps {
  query: string;
  field: VisitSearchField;
}

function groupByVisitor(messages: ContactMessage[]): Map<string, ContactMessage[]> {
  const grouped = new Map<string, ContactMessage[]>();
  for (const message of messages) {
    if (!message.visitorId) continue;
    const existing = grouped.get(message.visitorId);
    if (existing) existing.push(message);
    else grouped.set(message.visitorId, [message]);
  }
  return grouped;
}

export async function VisitorsPanel({ query, field }: VisitorsPanelProps) {
  const [analytics, visits, messages] = await Promise.all([
    getVisitorAnalytics(),
    getRecentVisits(),
    getMessages(MESSAGE_SCAN_LIMIT),
  ]);

  const byVisitor = groupByVisitor(messages);
  const rows: VisitRow[] = visits.map((visit) => ({
    ...visit,
    messages: byVisitor.get(visit.visitorId) ?? [],
  }));

  const matched = query ? rows.filter((row) => matchesVisit(row, query, field)) : rows;
  const shown = matched.slice(0, ROW_LIMIT);

  return (
    <section aria-labelledby="visitors" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="visitors" className="text-sm font-semibold text-fg">
            Visitors
          </h2>
          <p className="mt-0.5 text-xs text-fg-subtle">
            Anonymous pageviews from the public site. No IP addresses are stored.
          </p>
        </div>
        <VisitorSearch query={query} field={field} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total visits"
          value={analytics.totalVisits}
          hint={`${analytics.totalUniques} unique visitors all time`}
          icon={Eye}
        />
        <StatCard
          label="Visits today"
          value={analytics.visitsToday}
          hint={`${analytics.uniquesToday} unique today`}
          icon={Sunrise}
        />
        <StatCard
          label={`Last ${TREND_DAYS} days`}
          value={analytics.visitsWindow}
          hint={`${analytics.uniquesWindow} unique in the window`}
          icon={Users}
        />
        <StatCard
          label="Countries"
          value={analytics.countries.length}
          hint={
            analytics.countries[0]
              ? `Most from ${analytics.countries[0].label}`
              : "No location data yet"
          }
          icon={Globe2}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartPanel
          id="visits-trend"
          title="Visits over time"
          hint={`Last ${TREND_DAYS} days`}
          className="lg:col-span-2"
        >
          <VisitsTrendChart data={analytics.daily} />
        </ChartPanel>

        <ChartPanel id="visits-devices" title="Devices">
          <ShareDonut items={analytics.devices} emptyLabel="No device data yet." />
        </ChartPanel>

        <ChartPanel id="visits-countries" title="Top countries">
          <BreakdownBars items={analytics.countries} emptyLabel="No location data yet." />
        </ChartPanel>

        <ChartPanel id="visits-pages" title="Top pages">
          <BreakdownBars items={analytics.pages} emptyLabel="No pageviews yet." />
        </ChartPanel>

        <ChartPanel id="visits-referrers" title="Referrers">
          <BreakdownBars items={analytics.referrers} emptyLabel="No referrers yet." />
        </ChartPanel>

        <ChartPanel id="visits-browsers" title="Browsers">
          <BreakdownBars items={analytics.browsers} emptyLabel="No browser data yet." />
        </ChartPanel>

        <ChartPanel id="visits-os" title="Operating systems">
          <BreakdownBars items={analytics.operatingSystems} emptyLabel="No OS data yet." />
        </ChartPanel>
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-fg">Recent visits</h3>
          <p className="text-xs text-fg-subtle">
            {query
              ? `${matched.length} of the last ${visits.length} visits match “${query}”`
              : `Newest ${Math.min(visits.length, ROW_LIMIT)} of the last ${VISIT_SCAN_LIMIT} recorded`}
          </p>
        </div>

        {shown.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Eye}
              title={query ? "No matching visits" : "No visits recorded yet"}
              description={
                query
                  ? "Try a different term, or widen the field to “All fields”."
                  : "Visits appear here once someone opens the public site."
              }
            />
          </div>
        ) : (
          <VisitorTable rows={shown} />
        )}
      </div>
    </section>
  );
}
