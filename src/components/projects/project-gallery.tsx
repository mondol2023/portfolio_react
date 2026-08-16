import Image from "next/image";

import { StaggerItem, Stagger } from "@/components/motion/stagger";
import { isAllowedImageSrc } from "@/lib/constants/images";

/**
 * Screenshot gallery.
 *
 * A server component with no lightbox: the images are already rendered at a
 * useful size, and shipping a modal viewer to every visitor to occasionally
 * enlarge one is not a trade worth making. Sources that are not on the image
 * allowlist are dropped rather than rendered, so a bad URL in the CMS cannot
 * fail the page.
 */

export function ProjectGallery({ images, title }: { images: string[]; title: string }) {
  const valid = images.filter(isAllowedImageSrc);
  if (valid.length === 0) return null;

  return (
    <Stagger
      as="ul"
      step={0.06}
      className="grid gap-4 sm:grid-cols-2"
    >
      {valid.map((src, index) => (
        <StaggerItem
          as="li"
          key={src}
          className="relative aspect-[16/10] overflow-hidden rounded-card border border-border bg-bg-subtle"
        >
          <Image
            src={src}
            alt={`${title} — screenshot ${index + 1}`}
            fill
            loading="lazy"
            sizes="(min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
