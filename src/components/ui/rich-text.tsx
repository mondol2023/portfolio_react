import { cn } from "@/lib/utils/cn";

/**
 * Long-form text from the CMS.
 *
 * Content is stored as plain text, never HTML — an admin textarea that accepted
 * markup would be a stored-XSS vector on a public page. So the only formatting
 * understood here is what a person types naturally: a blank line starts a new
 * paragraph, and a run of lines beginning with `-` or `*` becomes a list.
 * Everything else is rendered as text by React, which escapes it.
 */

interface RichTextProps {
  content: string;
  className?: string;
}

const BULLET = /^\s*[-*•]\s+/;

/** Splits on blank lines, dropping empty blocks left by trailing newlines. */
function toBlocks(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function RichText({ content, className }: RichTextProps) {
  const blocks = toBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-5 text-fg-muted", className)}>
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim());
        const isList = lines.every((line) => BULLET.test(line));
        const key = `${index}-${block.slice(0, 24)}`;

        if (isList) {
          return (
            <ul key={key} className="flex flex-col gap-3">
              {lines.map((line) => {
                const item = line.replace(BULLET, "");
                return (
                  <li key={item} className="flex gap-3 leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{item}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={key} className="leading-relaxed whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}
