import type { SectionTone } from "@/lib/constants/section-tone";

/**
 * Which act of the story a chapter belongs to.
 *
 * Four stages, not seven chapters. A case study that changed its environment on
 * every heading would be a slideshow; changing it four times means each change
 * *means* something — the reader feels the room turn when the story turns, and
 * not otherwise. Approach, solution and screens share `structure` because they
 * are one movement: the thinking, the thing built from it, and the proof.
 *
 * `challenges` returns to `tension` on purpose. The story has already been
 * somewhere dim once, and coming back to it is what makes the closing chapter
 * read as a resolution rather than as one more section.
 *
 * The stage is looked up by chapter id rather than by index, so a project that
 * skips chapters still gets the right environment for the ones it has.
 */
export type StoryStage = "open" | "tension" | "structure" | "clarity";

const STAGE_BY_CHAPTER: Record<string, StoryStage> = {
  overview: "open",
  problem: "tension",
  approach: "structure",
  solution: "structure",
  screens: "structure",
  challenges: "tension",
  results: "clarity",
};

/** Unknown ids fall to `structure` — the neutral middle of the arc. */
export function stageForChapter(id: string): StoryStage {
  return STAGE_BY_CHAPTER[id] ?? "structure";
}

/**
 * The two chapters the page is allowed to be cinematic at.
 *
 * `approach` is the turn — the story stops describing what was wrong and starts
 * describing what was done about it, and it is the one place in the arc where
 * the act changes *and* the subject changes at the same heading. `results` is
 * the landing. Everything between them is deliberately ordinary, because a page
 * where every chapter is a moment has no moments.
 *
 * A project with no approach chapter simply gets one signature beat instead of
 * two. Nothing is invented to give it the other.
 */
const SIGNATURE_CHAPTERS = new Set(["approach", "results"]);

export function isSignatureChapter(id: string): boolean {
  return SIGNATURE_CHAPTERS.has(id);
}

/**
 * True where a chapter opens a different act than the one before it.
 *
 * This is the whole of the threshold logic, and it is derived rather than
 * authored: the acts are already declared per chapter, so the boundaries
 * between them are a fact about the project's chapter list, not a flag an
 * editor has to remember to set. A project that happens to have no problem
 * chapter simply has one fewer threshold.
 *
 * The first chapter is never a threshold — there is nothing above it to have
 * crossed out of.
 */
export function isActThreshold(previousId: string | undefined, id: string): boolean {
  if (previousId === undefined) return false;
  return stageForChapter(previousId) !== stageForChapter(id);
}

export interface StageConfig {
  /**
   * Drives the shared backdrop. The chapter carries `data-tone-anchor`, so the
   * single IntersectionObserver already running in `ambient-background.tsx`
   * picks it up — no second observer, no per-chapter scroll listener.
   */
  tone: SectionTone;
  /** Seconds between a chapter's own parts. */
  step: number;
  /**
   * Seconds the whole chapter holds before its first part moves. The act's
   * intake of breath: `tension` waits, `structure` does not.
   */
  lead: number;
  /** Vertical rhythm. `tension` gets more room: the pause is the point. */
  spacing: string;
  /** How the depth plane behind the text is composed and how present it is. */
  plane: string;
  /** How strongly the connector from the chapter above reads. */
  thread: string;
  /**
   * The reading column's composition. Indent and measure are the one piece of
   * *layout* that varies between acts — `tension` is narrower and set further
   * in, so the column physically tightens where the story does, and opens back
   * up when it resolves. Everything else about a chapter is identical, which is
   * what keeps four environments from turning into four layouts.
   */
  body: string;
}

/**
 * Stage -> what actually differs between acts: how fast the chapter assembles,
 * how long it waits first, how much air it gets, how its middle ground is built,
 * and how wide the column it is read in.
 */
export const STAGE_CONFIG: Record<StoryStage, StageConfig> = {
  open: {
    // Quiet and unhurried. Nothing is competing for attention yet, so the
    // chapter simply arrives — no wait in front of it, no compression in it.
    tone: "story-open",
    step: 0.1,
    lead: 0,
    spacing: "",
    plane: "story-plane--open opacity-70",
    thread: "story-thread--open",
    body: "max-w-[68ch] sm:pl-[5.5rem]",
  },
  tension: {
    // Slower, later and tighter. A chapter about what was hard should take
    // longer to start, take longer to arrive, stand further from its neighbours
    // and be read in a narrower column — that is the whole of the "deliberate
    // pause", and it costs no extra animation to get.
    tone: "story-tension",
    step: 0.16,
    lead: 0.12,
    spacing: "py-10 sm:py-16",
    plane: "story-plane--tension opacity-100",
    thread: "story-thread--tension",
    body: "max-w-[60ch] sm:pl-[7rem]",
  },
  structure: {
    // The most confident act: no wait, the shortest gap between parts, the
    // reference indent every other act is measured against. Things coming
    // together should feel like things coming together quickly.
    tone: "story-structure",
    step: 0.09,
    lead: 0,
    spacing: "",
    plane: "story-plane--structure opacity-60",
    thread: "story-thread--structure",
    body: "max-w-[68ch] sm:pl-[5.5rem]",
  },
  clarity: {
    tone: "story-clarity",
    step: 0.12,
    lead: 0.08,
    spacing: "py-8 sm:py-12",
    plane: "story-plane--clarity opacity-90",
    thread: "story-thread--clarity",
    body: "max-w-[64ch] sm:pl-[5.5rem]",
  },
};
