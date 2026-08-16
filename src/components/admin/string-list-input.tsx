"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Tag-style editor for the string arrays in the schema — technologies,
 * responsibilities, gallery URLs.
 *
 * Entries are committed with Enter, Tab or a comma, and Backspace on an empty
 * field removes the last one. The values live in the parent form (via RHF's
 * `Controller`); only the half-typed draft is local state, so there is never a
 * second copy of the truth to keep in sync.
 */

interface StringListInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
  placeholder?: string;
  /** Entries wrap onto their own row when they are long, e.g. URLs. */
  block?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

const COMMIT_KEYS = ["Enter", "Tab", ","];

export function StringListInput({
  value,
  onChange,
  id,
  placeholder = "Type and press Enter",
  block = false,
  ...aria
}: StringListInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const entry = raw.trim();
    // Silently ignoring duplicates is friendlier than an error for something
    // the user can simply see is already in the list.
    if (!entry || value.includes(entry)) return;
    onChange([...value, entry]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (COMMIT_KEYS.includes(event.key)) {
      // Tab still moves focus when there is nothing to commit.
      if (event.key === "Tab" && draft.trim() === "") return;
      event.preventDefault();
      commit(draft);
      setDraft("");
      return;
    }

    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-2 transition-colors",
        "focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--accent-ring)]",
        aria["aria-invalid"] && "border-danger",
      )}
    >
      {value.length > 0 ? (
        <ul className={cn("mb-2 flex gap-1.5", block ? "flex-col" : "flex-wrap")}>
          {value.map((entry) => (
            <li
              key={entry}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle",
                "py-1 pr-1 pl-2.5 text-xs text-fg",
                block && "justify-between",
              )}
            >
              <span className={cn(block && "truncate font-mono")}>{entry}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== entry))}
                className="rounded p-0.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Remove {entry}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        id={id}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        // Committing on blur means a typed-but-unconfirmed entry is not lost
        // when the user tabs straight to Save.
        onBlur={() => {
          commit(draft);
          setDraft("");
        }}
        placeholder={placeholder}
        className="w-full bg-transparent px-1.5 py-1 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
        {...aria}
      />
    </div>
  );
}
