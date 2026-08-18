"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { countryFlag } from "@/lib/analytics/geo";
import { formatVisitTime } from "@/lib/analytics/period";
import type { VisitRow } from "@/lib/types/analytics";
import { formatFullDate } from "@/lib/utils/dates";

/**
 * The searchable visit log. Rows whose visitor also sent a contact message
 * carry a badge that opens their messages.
 */
interface VisitorTableProps {
  rows: VisitRow[];
}

function locationOf(row: VisitRow): string {
  const parts = [row.city, row.region, row.countryName || row.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown";
}

export function VisitorTable({ rows }: VisitorTableProps) {
  const [selected, setSelected] = useState<VisitRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-3xl border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium text-fg-subtle">
              <th scope="col" className="px-5 py-3 font-medium">
                When
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Visitor
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Location
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Page
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Device
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Referrer
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-surface-hover">
                <td className="px-5 py-3 whitespace-nowrap text-fg-muted">
                  {formatVisitTime(row.createdAt)}
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg-subtle">
                      {row.visitorId ? row.visitorId.slice(0, 8) : "—"}
                    </span>
                    {row.messages.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <Badge variant="accent">
                          <MessageSquare className="size-3" aria-hidden="true" />
                          {row.messages.length}
                        </Badge>
                        <span className="sr-only">
                          Show {row.messages.length} message
                          {row.messages.length === 1 ? "" : "s"} from this visitor
                        </span>
                      </button>
                    ) : null}
                  </span>
                </td>
                <td className="px-5 py-3 text-fg-muted">
                  {countryFlag(row.country) ? `${countryFlag(row.country)} ` : ""}
                  {locationOf(row)}
                </td>
                <td className="max-w-3xs truncate px-5 py-3 text-fg-muted" title={row.path}>
                  {row.path}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-fg-muted">
                  <span className="capitalize">{row.device}</span> · {row.browser} · {row.os}
                </td>
                <td className="max-w-3xs truncate px-5 py-3 text-fg-subtle">
                  {row.referrer || "Direct"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Messages from this visitor"
        description={selected ? `Visitor ${selected.visitorId.slice(0, 8)} · ${locationOf(selected)}` : undefined}
      >
        <ul className="max-h-96 space-y-4 overflow-y-auto pb-2">
          {selected?.messages.map((message) => (
            <li key={message.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{message.subject}</p>
                  <p className="mt-0.5 truncate text-xs text-fg-subtle">
                    {message.name} · {message.email}
                  </p>
                </div>
                {message.read ? null : <Badge variant="accent">New</Badge>}
              </div>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-fg-muted">
                {message.message}
              </p>
              <p className="mt-3 text-xs text-fg-subtle">{formatFullDate(message.createdAt)}</p>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
