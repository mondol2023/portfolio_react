"use client";

import { motion } from "motion/react";

import { createStaggerVariants } from "@/components/motion/variants";
import { DEFAULT_IDENTITY, type ProjectIdentity } from "@/lib/constants/project-identity";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";
import { blockKey, parseRichBlocks } from "@/lib/utils/rich-blocks";

import { storyBlockVariants } from "./story-motion";

/**
 * A chapter's prose, revealed a block at a time.
 *
 * The unit of animation is the **semantic group** — one paragraph, one whole
 * list, one quotation — never a word, a character or a sentence. A reader
 * should be able to start reading a paragraph the moment they see it; anything
 * finer than a block turns reading into waiting, and a reader who scrolls fast
 * would be chasing text down the page.
 *
 * Structurally this component is both a stagger child and a stagger parent. It
 * declares `variants` but no `initial`/`whileInView`, so it inherits the
 * chapter's hidden/visible state through Motion's context and adds only
 * `staggerChildren` for its own blocks. That is why there is no delay
 * arithmetic here and no second viewport trigger: the chapter fires once, and
 * the blocks queue behind the heading that introduced them.
 *
 * It parses with `parseRichBlocks`, the same function `<RichText>` uses, so the
 * animated and static renderings can never disagree about where a block begins.
 * Markup and classes are kept in step with `rich-text.tsx` deliberately: this is
 * the same document, moving.
 */

/**
 * Shorter than the chapter's own step. The parts of a chapter are distinct
 * beats; the paragraphs within one are a single thought arriving in order.
 */
const BLOCK_STEP = 0.07;

interface StoryProseProps {
  content: string;
  className?: string;
  /** Matches the chapter's emphasis — larger, higher-contrast body copy. */
  emphasis?: boolean;
  /**
   * The project's character, at a third of the strength the chapter head gets.
   * A body column carries the motif; it does not perform it.
   */
  identity?: ProjectIdentity;
}

export function StoryProse({
  content,
  className,
  emphasis = false,
  identity = DEFAULT_IDENTITY,
}: StoryProseProps) {
  const reducedMotion = useMotionPreference();
  const blocks = parseRichBlocks(content);
  const blockVariants = storyBlockVariants(reducedMotion, identity);

  if (blocks.length === 0) return null;

  return (
    <motion.div
      variants={createStaggerVariants(reducedMotion, BLOCK_STEP)}
      className={cn(
        // `break-words` is inherited, so this one declaration covers the
        // paragraphs and the list: a pasted URL wraps instead of pushing the
        // page sideways on a narrow screen.
        "flex flex-col gap-5 break-words text-base text-fg-muted",
        emphasis && "text-lg text-fg sm:text-xl",
        className,
      )}
    >
      {blocks.map((block, index) => {
        const key = blockKey(block, index);

        if (block.kind === "list") {
          return (
            <motion.ul key={key} variants={blockVariants} className="flex flex-col gap-3">
              {block.items.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </motion.ul>
          );
        }

        if (block.kind === "quote") {
          return (
            <motion.blockquote
              key={key}
              variants={blockVariants}
              className="border-l-2 border-tone pl-5 text-fg italic leading-relaxed whitespace-pre-line"
            >
              {block.text}
            </motion.blockquote>
          );
        }

        return (
          <motion.p
            key={key}
            variants={blockVariants}
            className="leading-relaxed whitespace-pre-line"
          >
            {block.text}
          </motion.p>
        );
      })}
    </motion.div>
  );
}
