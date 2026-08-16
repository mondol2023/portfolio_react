import Image from "next/image";

import { isAllowedImageSrc } from "@/lib/constants/images";
import { getBrandColor, getMonogram } from "@/lib/constants/tech-brand";
import { cn } from "@/lib/utils/cn";

/**
 * Square icon for a technology.
 *
 * Prefers the icon URL stored with the skill; otherwise draws a monogram tinted
 * with the technology's brand colour. We do not bundle third-party logo
 * artwork, so the monogram is the normal case rather than an error state.
 */

type TechTileSize = "sm" | "md";

/** `sm` is sized for inline use inside a marquee pill, `md` for card layouts. */
const SIZES: Record<TechTileSize, { box: string; image: string; label: string; px: number }> = {
  sm: { box: "size-6 rounded-md", image: "size-4", label: "text-[0.5625rem]", px: 16 },
  md: { box: "size-10 rounded-lg", image: "size-6", label: "text-xs", px: 24 },
};

interface TechTileProps {
  name: string;
  iconUrl?: string;
  size?: TechTileSize;
  className?: string;
}

export function TechTile({ name, iconUrl, size = "md", className }: TechTileProps) {
  const color = getBrandColor(name);
  const scale = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-border",
        scale.box,
        className,
      )}
      style={
        isAllowedImageSrc(iconUrl)
          ? undefined
          : // Tint stays subtle: a wash of the brand colour behind its own text.
            { backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }
      }
    >
      {isAllowedImageSrc(iconUrl) ? (
        <Image
          src={iconUrl}
          alt=""
          width={scale.px}
          height={scale.px}
          className={cn("object-contain", scale.image)}
        />
      ) : (
        <span className={cn("font-mono font-semibold tracking-tight", scale.label)}>
          {getMonogram(name)}
        </span>
      )}
    </span>
  );
}
