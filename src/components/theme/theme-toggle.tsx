"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils/cn";

/**
 * Two-state theme control: Light / Dark.
 *
 * A segmented control rather than a single cycling button, so the current theme
 * is readable without clicking it. Rendered as radios so arrow keys move
 * between options natively.
 *
 * There is deliberately no "System" option. Its monitor icon reads as a
 * display-mode switch rather than a theme, and what it offered is already the
 * default: `ThemeProvider` starts every first-time visitor on their OS
 * preference, and only a click here pins one.
 *
 * The active segment follows `resolvedTheme`, not `theme` — until something is
 * pinned the stored value is still "system", and keying off it would light
 * neither half.
 *
 * Nothing is marked active until mount: on the server the resolved theme is
 * unknown, and guessing produces a hydration mismatch and a visible flicker.
 */

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = mounted && resolvedTheme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              isActive
                ? "bg-accent text-accent-fg"
                : "text-fg-subtle hover:bg-surface-hover hover:text-fg",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
