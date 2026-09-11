import { cn } from "@/lib/utils/cn";

/**
 * The two ends of the story, where a case study used to have margin.
 *
 * A page that opens on a cover image and then simply starts printing chapters
 * has a seam in it: the hero finishes, whitespace happens, content begins. So
 * does a page whose last chapter is followed by a full-bleed border and a pair
 * of navigation cards. Both of those boundaries are the same problem — the
 * story's one continuous line stops at the edge of the chapter list — and both
 * are solved with the line itself rather than with another effect.
 *
 * `<StoryOverture>` is the thread beginning. It occupies the gap between the
 * cover and chapter one, on the same left axis every chapter connector uses, so
 * the first chapter is reached by a line that started under the opening shot
 * instead of appearing on its own. `<StoryCoda>` is the same line at the far
 * end, running its gradient the other way: after the story has arrived at its
 * conclusion and the credits have been read, the thread diffuses into the
 * ground the pager sits on.
 *
 * Both are server components on purpose. Neither reads a preference, subscribes
 * to a scroll position or holds state — the overture's draw is a CSS
 * scroll-driven animation (`.story-thread--overture` in `globals.css`), which
 * means the one signature transition on this page costs zero JavaScript and
 * zero listeners, and collapses to a plain static line both under reduced
 * motion and in browsers without `animation-timeline`.
 *
 * They are `aria-hidden` and carry no text. Everything they communicate is also
 * said by the chapter numbering and the headings, which is the test: delete
 * them and the story is still navigable, just less continuous.
 */

/**
 * The height is the margin these replace, not a new spacing scale.
 *
 * The chapter list used to open on `mt-24 sm:mt-32` and the pager to stand off
 * on the same, so the page's vertical rhythm is unchanged by this: the space
 * that was empty now has the line running through it. A chapter's own connector
 * is a shorter length of the same hairline (`h-20`, `sm:h-28`) filling the
 * shorter gap between chapters, which is what makes all of it read as one line
 * rather than as a decoration that happens to be vertical.
 */
const SPAN = "h-24 sm:h-32";

export function StoryOverture() {
  return (
    <div aria-hidden="true" className={cn("relative", SPAN)}>
      <span
        className={cn(
          "story-thread story-thread--overture pointer-events-none absolute inset-y-0 left-0 w-px",
        )}
      />
    </div>
  );
}

export function StoryCoda() {
  return (
    <div aria-hidden="true" className={cn("relative", SPAN)}>
      <span
        className={cn(
          "story-thread story-thread--coda pointer-events-none absolute inset-y-0 left-0 w-px",
        )}
      />
    </div>
  );
}
