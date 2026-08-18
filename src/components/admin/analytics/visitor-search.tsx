"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input, Select } from "@/components/ui/input";
import { VISIT_SEARCH_FIELDS, type VisitSearchField } from "@/lib/analytics/search";

/**
 * Search icon that reveals the search bar.
 *
 * A plain GET form: the query lands in the URL, the server filters, and the
 * result is linkable and survives a refresh. Only the show/hide toggle needs
 * client state.
 */
interface VisitorSearchProps {
  query: string;
  field: VisitSearchField;
}

export function VisitorSearch({ query, field }: VisitorSearchProps) {
  // Stay open when a search is already applied.
  const [open, setOpen] = useState(query !== "");
  const inputRef = useRef<HTMLInputElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (open && opened.current) inputRef.current?.focus();
    opened.current = open;
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="sr-only">Search visitors</span>
      </button>
    );
  }

  return (
    <form method="GET" action="/admin" role="search" className="flex flex-1 flex-wrap gap-2">
      <div className="relative min-w-45 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Name, city, page, browser, August…"
          aria-label="Search visitors"
          className="py-2 pl-9 text-sm"
        />
      </div>

      <Select
        name="field"
        defaultValue={field}
        aria-label="Field to search"
        className="w-auto py-2 text-sm"
      >
        {VISIT_SEARCH_FIELDS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <button
        type="submit"
        className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Search
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">Hide search</span>
      </button>
    </form>
  );
}
