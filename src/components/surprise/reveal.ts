import { injectStyle } from "./effect";

/**
 * The page going out under the blast, and developing back in afterwards.
 *
 * Three phases, all inside one keyframe so a block only ever runs one animation:
 *
 *   out    the block drops away and goes soft, fast enough to be gone before the
 *          smoke is at full. Eased *in*, so it reads as being knocked out by the
 *          blast rather than politely fading.
 *   blank  nothing on screen. Long enough that the smoke finishes clearing over
 *          an empty page and there is a beat of blankness after it, which is the
 *          pause the reveal lands on. `REVEAL_DIP_MS` is exported so the caller
 *          can restyle the page at the top of this phase — in the dark, under
 *          the thickest smoke, where a swap costs nothing.
 *   in     the block comes back over a second and a half, eased *out*.
 *
 * Blocks that are on screen are staggered in document order, so the page
 * reassembles top to bottom instead of cross-fading as one sheet. Blocks the
 * reader cannot see are given no delay at all — a stagger nobody watches is just
 * a slower reveal.
 *
 * Standalone, like everything else in this folder. The blank phase is a
 * parameter because its right length depends entirely on what is covering the
 * page: 1.2s suits a bomb, and almost nothing suits a plain restyle.
 *
 * ```ts
 * import { revealContents } from "@/components/surprise/reveal";
 *
 * document.body.classList.toggle("dark");
 * revealContents(140);
 * ```
 *
 * Transform is deliberately absent. A translated section becomes a containing
 * block, which is exactly the trap `sections/section.tsx` documents — it would
 * re-anchor anything fixed or sticky inside and move the rects `ScrollVeil`
 * measures. `filter` shares the containing-block problem but not the layout one,
 * so it is used where nothing fixed lives underneath and skipped where it does.
 */

const ATTR = "data-surprise-reveal";

/* ---------------------------------------------------------------- timing -- */

/** Knocked out. Short: the wash it hides under takes about 400ms to reach full. */
const OUT_MS = 260;

/** Default blank beat — long enough for a covering animation to finish over it. */
const BLANK_MS = 1200;

/** Coming back. Slow on purpose; this is the part the reader is meant to watch. */
const IN_MS = 1500;

/** Gap between one block starting and the next. */
const STAGGER_MS = 110;

/**
 * How long after `revealContents()` the page is fully hidden.
 *
 * Change what the page looks like at this moment and nobody sees the change
 * happen — they only see the result arrive. Constant regardless of the blank
 * length, so a caller can schedule against it without doing arithmetic.
 */
export const REVEAL_DIP_MS = OUT_MS;

/** Knocked out: starts slow, accelerates away. */
const OUT_EASE = "cubic-bezier(0.55, 0, 1, 0.45)";

/**
 * Developing back: moves early, then takes its time settling.
 *
 * Not one of the expo curves — over a second and a half those arrive at nearly
 * full opacity in the first fifth of the duration, which turns a long fade into
 * a quick one with a long tail nobody can see.
 */
const IN_EASE = "cubic-bezier(0.33, 0, 0.2, 1)";

/**
 * The stylesheet for one run.
 *
 * Built per call rather than once at module scope: the keyframe stops are
 * percentages of the total, so they move whenever the blank phase does.
 */
function sheet(blankMs: number): string {
  const total = OUT_MS + blankMs + IN_MS;
  const outAt = ((OUT_MS / total) * 100).toFixed(2);
  const inAt = (((OUT_MS + blankMs) / total) * 100).toFixed(2);

  return `
    @keyframes surprise-reveal-soft {
      0% {
        opacity: 1;
        filter: blur(0px);
        animation-timing-function: ${OUT_EASE};
      }
      ${outAt}% { opacity: 0; filter: blur(8px); }
      ${inAt}% {
        opacity: 0;
        filter: blur(8px);
        animation-timing-function: ${IN_EASE};
      }
      100% { opacity: 1; filter: blur(0px); }
    }

    /* Same shot without the defocus — see the note on the header below. */
    @keyframes surprise-reveal-plain {
      0%        { opacity: 1; animation-timing-function: ${OUT_EASE}; }
      ${outAt}% { opacity: 0; }
      ${inAt}%  { opacity: 0; animation-timing-function: ${IN_EASE}; }
      100%      { opacity: 1; }
    }

    /*
     * The linear timing function here is not laziness: each keyframe above sets
     * its own curve, and anything other than linear on the rule would be applied
     * to the segments that do not.
     */
    html [${ATTR}] {
      animation-duration: ${total}ms;
      animation-timing-function: linear;
      animation-delay: var(--reveal-delay, 0ms);
      animation-fill-mode: both;
      will-change: opacity, filter;
    }

    html [${ATTR}="soft"]  { animation-name: surprise-reveal-soft; }
    html [${ATTR}="plain"] { animation-name: surprise-reveal-plain; }
  `;
}

/* ------------------------------------------------------------------ run -- */

/** The reveal in progress, if any. Two at once would fight over the same blocks. */
let running: (() => void) | null = null;

function onScreen(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

/**
 * The blocks the reveal treats as units: each section of the page, plus the
 * header and footer around them.
 *
 * Anchored on `#main` and walked outward rather than selected off `body`,
 * because the shell sits inside however many context providers the app happens
 * to wrap it in — some of which render an element and some of which do not. The
 * siblings that are *not* collected matter just as much: the ambient
 * background, the effect layers and the surprise button itself all live out
 * here, and none of them should dip when the content does.
 */
function blocks(): HTMLElement[] {
  const main = document.querySelector<HTMLElement>("#main");
  if (!main) return [];

  const isShell = (node: Element): node is HTMLElement =>
    node instanceof HTMLElement && (node.tagName === "HEADER" || node.tagName === "FOOTER");

  const found = [
    ...Array.from(main.parentElement?.children ?? []).filter(isShell),
    ...Array.from(main.children).filter((node): node is HTMLElement => node instanceof HTMLElement),
  ];

  // Document order, so the stagger runs down the page rather than in the order
  // the two lists above happened to be concatenated.
  return found.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}

/**
 * Takes the page out, holds it out, and brings it back.
 *
 * @param blankMs How long the page stays empty between the two. Match this to
 *   whatever is covering the screen — the caller is the only one that knows.
 * @returns The undo. Calling it mid-flight puts every block back immediately,
 *   which is what a second press has to do before starting its own reveal.
 */
export function revealContents(blankMs: number = BLANK_MS): () => void {
  running?.();

  const removeStyle = injectStyle("reveal", sheet(blankMs));
  const found = blocks();

  let visible = 0;

  for (const block of found) {
    /*
     * The header is the one block that keeps its focus. It hosts the mobile
     * menu, which is `position: fixed`, and any filter — including `blur(0px)`
     * — would make the header its containing block and drag the open menu into
     * the header's box for the length of the animation.
     */
    block.setAttribute(ATTR, block.tagName === "HEADER" ? "plain" : "soft");

    if (onScreen(block)) {
      block.style.setProperty("--reveal-delay", `${visible * STAGGER_MS}ms`);
      visible += 1;
    }
  }

  const clear = () => {
    for (const block of found) {
      block.removeAttribute(ATTR);
      block.style.removeProperty("--reveal-delay");
    }
    removeStyle();
    running = null;
  };

  // One timer for the whole set rather than an `animationend` listener per
  // block: the last block to finish is known up front, and a listener on a
  // block that gets re-rendered mid-flight would never fire.
  const last = OUT_MS + blankMs + IN_MS + Math.max(visible - 1, 0) * STAGGER_MS;
  const timer = window.setTimeout(clear, last + 60);

  const stop = () => {
    window.clearTimeout(timer);
    clear();
  };

  running = stop;
  return stop;
}
