/**
 * First focusable element on the page: lets keyboard and screen-reader users
 * jump past the navigation straight to the content. Invisible until focused.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only-focusable fixed top-4 left-4 z-100 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg shadow-floating focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Skip to content
    </a>
  );
}
