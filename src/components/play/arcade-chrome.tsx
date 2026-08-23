import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * The chrome the games wear, in the same language as the rest of the site.
 *
 * Game Mode predates the rebuild, and it showed: three screens each inventing
 * their own translucent-black pills and sentence-case buttons while the
 * portfolio around them had settled on mono channel labels, bracketed actions
 * and the token palette. These are the pieces that reconcile them, so a visitor
 * who leaves the Project Arcade and presses PLAY arrives somewhere that is
 * obviously the same cabinet.
 *
 * Two rules hold for everything here:
 *
 * 1. Scope, not colour. Nothing hardcodes a palette — each screen wraps its
 *    chrome in `<div className="dark" data-tone="work">…`, which is what
 *    `globals.css` keys the dark rose tone off, so these read as the arcade's
 *    own colour rather than as a second theme. `dark` is not a preference here:
 *    the games are full-bleed canvases with their own lighting, and a light
 *    panel floating over one is a hole punched in the scene.
 * 2. No game logic. `ArcadeAction` forwards every button prop through — the
 *    ids the game hooks bind to (`play-btn`, `resume-btn`, `restart-btn`,
 *    `whack-play-btn`) survive untouched.
 */

/** The way back out. Always visible, always in the same corner. */
export function ArcadeExit({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2",
        "font-mono text-[11px] tracking-[0.18em] text-fg-muted uppercase backdrop-blur-sm",
        "transition-colors hover:border-tone hover:text-tone",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone",
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      {label}
    </Link>
  );
}

/**
 * The live score readout.
 *
 * Zero-padded, because a number that changes width shifts the panel under it
 * every time the visitor scores — and `tabular-nums` for the same reason on the
 * digits that do change.
 */
export function ArcadeScore({
  score,
  target,
  className,
}: {
  score: number;
  target?: number;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-full border border-border bg-surface/80 px-4 py-2 font-mono text-[11px] tracking-[0.18em] uppercase backdrop-blur-sm",
        className,
      )}
    >
      <span className="text-fg-subtle">Score</span>{" "}
      <span className="tabular-nums text-tone">{String(score).padStart(3, "0")}</span>
      {target !== undefined ? (
        <span className="text-fg-subtle"> / {String(target).padStart(3, "0")}</span>
      ) : null}
    </p>
  );
}

/**
 * The centred card every non-playing state uses: start, paused, over, won.
 *
 * One component for all four so the screens cannot drift apart — the only thing
 * that changes between them is the `status` line and what is in the footer.
 */
export function ArcadePanel({
  status,
  title,
  children,
  actions,
  className,
}: {
  status: string;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-md rounded-card border border-border bg-surface/85 p-8 text-center backdrop-blur-sm",
        className,
      )}
    >
      <p className="font-mono text-[11px] tracking-[0.24em] text-tone uppercase">{status}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg">{title}</h1>

      {children ? (
        <div className="mt-4 text-sm leading-relaxed text-fg-muted">{children}</div>
      ) : null}

      <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {actions}
      </div>
    </div>
  );
}

/** The bracketed affordance the rebuilt sections use for their own actions. */
export function ArcadeAction({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "rounded-full border border-tone/50 bg-tone-soft px-5 py-2.5",
        "font-mono text-[11px] tracking-[0.18em] text-tone uppercase",
        "transition-colors hover:border-tone hover:bg-tone/15",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone",
        className,
      )}
    >
      [ {children} ]
    </button>
  );
}

/** The same affordance as a link, for the ones that navigate. */
export function ArcadeActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border border-border px-5 py-2.5",
        "font-mono text-[11px] tracking-[0.18em] text-fg-muted uppercase",
        "transition-colors hover:border-tone hover:text-tone",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone",
        className,
      )}
    >
      [ {children} ]
    </Link>
  );
}

/**
 * Wrapper that puts everything inside it in the arcade's colour scope.
 *
 * `dark` and `data-tone` have to sit on the same element for the shell to be
 * one node, and `globals.css` matches `.dark [data-tone="work"]` — a descendant
 * selector — so the tone would not resolve if they shared one. Hence the inner
 * div: the outer establishes the theme, the inner claims the tone within it.
 */
export function ArcadeScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="dark contents">
      <div data-tone="work" className={className}>
        {children}
      </div>
    </div>
  );
}
