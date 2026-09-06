/**
 * Reduces page scroll to a single `0` (top) → `1` (bottom) fraction.
 *
 * rAF-throttled: scroll fires far more often than the page repaints, and only
 * the value at paint time is ever used.
 */
export function observeScrollProgress(onChange: (t: number) => void): () => void {
  let queued = false;

  function read() {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    onChange(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(read);
  }

  read();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
