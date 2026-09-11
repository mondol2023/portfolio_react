import { blockKey, parseRichBlocks } from "@/lib/utils/rich-blocks";
import { cn } from "@/lib/utils/cn";

/**
 * Long-form text from the CMS.
 *
 * Content is stored as plain text, never HTML — an admin textarea that accepted
 * markup would be a stored-XSS vector on a public page. The conventions it does
 * understand (blank line, `-` list, `>` quotation) live in
 * `@/lib/utils/rich-blocks`, shared with the case study's animated renderer so
 * the two cannot disagree about where a block starts. Everything else is
 * rendered as text by React, which escapes it.
 */

interface RichTextProps {
  content: string;
  className?: string;
}

export function RichText({ content, className }: RichTextProps) {
  const blocks = parseRichBlocks(content);
  if (blocks.length === 0) return null;

  return (
    // `break-words` is inherited, so one declaration here covers the paragraphs
    // and the list below: an unbroken URL pasted into a CMS textarea wraps
    // instead of pushing the page sideways on a narrow screen.
    <div className={cn("flex flex-col gap-5 break-words text-fg-muted", className)}>
      {blocks.map((block, index) => {
        const key = blockKey(block, index);

        if (block.kind === "list") {
          return (
            <ul key={key} className="flex flex-col gap-3">
              {block.items.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "quote") {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-tone pl-5 text-fg italic leading-relaxed whitespace-pre-line"
            >
              {block.text}
            </blockquote>
          );
        }

        return (
          <p key={key} className="leading-relaxed whitespace-pre-line">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
