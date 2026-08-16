import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { RichText } from "@/components/ui/rich-text";

/**
 * One chapter of a case study.
 *
 * Renders nothing when its field is empty, which is what lets the page describe
 * a small project in two blocks and a large one in five without either looking
 * unfinished. The index label is passed in rather than derived so the numbering
 * stays continuous when a block is skipped.
 */

interface CaseStudyBlockProps {
  index: string;
  title: string;
  /** Plain-text body from the CMS. */
  content?: string;
  /** Rendered instead of `content` for blocks that are not prose. */
  children?: ReactNode;
}

export function CaseStudyBlock({ index, title, content, children }: CaseStudyBlockProps) {
  const body = children ?? (content ? <RichText content={content} /> : null);
  if (!body) return null;

  return (
    <Reveal
      as="section"
      className="grid gap-6 border-t border-border pt-10 lg:grid-cols-[16rem_1fr] lg:gap-12"
    >
      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="label-mono mb-3">{index}</p>
        <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h2>
      </div>

      <div className="max-w-2xl text-base">{body}</div>
    </Reveal>
  );
}
