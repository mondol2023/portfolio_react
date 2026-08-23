import { Globe } from "lucide-react";

import { getSocialIconPath } from "@/lib/constants/social-brand";

/**
 * A social network's mark, by label.
 *
 * Shared by the contact row and the footer so a network is drawn the same way
 * in both places. A network we ship no mark for still renders — as a globe —
 * because a working link with a generic icon beats a missing link.
 */
export function SocialIcon({ label, className }: { label: string; className?: string }) {
  const path = getSocialIconPath(label);

  // Lucide's globe is a stroked 24x24 icon and the brand marks are filled, so
  // they are drawn differently on purpose rather than forced to match.
  if (!path) return <Globe aria-hidden="true" className={className} />;

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={path} />
    </svg>
  );
}
