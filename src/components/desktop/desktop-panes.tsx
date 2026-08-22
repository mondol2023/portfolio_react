import { Children, type ReactNode } from "react";

/**
 * Makes each section its own screen.
 *
 * Wrapping happens here rather than inside `Section` for two reasons: the hero
 * is not a `Section`, and `/projects/[slug]` renders `Section`s that must stay
 * part of one continuous document. Keeping the pane outside means the home page
 * opts in with a single wrapper and nothing else in the tree has to know.
 *
 * `min-h-dvh`, never a fixed height: Projects and Experience can outgrow the
 * viewport, and a hard height would clip them. Taller content simply makes a
 * taller pane, and `proximity` snapping (see `use-section-paging.ts`) lets the
 * reader stop in the middle of one.
 *
 * A server component — the panes are markup, and the behaviour that animates
 * them lives entirely in CSS and in the hook on the chrome.
 */

export function DesktopPanes({ children }: { children: ReactNode }) {
  return (
    <>
      {Children.map(children, (child) => (
        // `pb-14` matches the taskbar, so centred content is centred in the
        // space the visitor can actually see.
        <div
          data-pane
          className="flex min-h-dvh w-full snap-start flex-col justify-center pb-14"
        >
          {child}
        </div>
      ))}
    </>
  );
}
