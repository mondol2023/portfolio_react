import { isAllowedImageSrc } from "@/lib/constants/images";
import { DEFAULT_IDENTITY, type ProjectIdentity } from "@/lib/constants/project-identity";

import { EvidenceExhibition } from "./evidence-exhibition";
import type { EvidenceItem } from "./evidence-viewer";

/**
 * The evidence chapter's screenshots.
 *
 * This stays a server component and does one job: turn the stored gallery into
 * the list of exhibits worth hanging. Sources that are not on the image
 * allowlist are dropped rather than rendered, so a bad URL in the CMS cannot
 * fail the page, and a project whose whole gallery is unusable renders no
 * chapter at all instead of an empty one.
 *
 * The numbering is assigned after filtering, so the exhibits read 01, 02, 03
 * with no gaps where a rejected URL used to be — a reader referring to "03"
 * and an editor counting rows should land on the same picture.
 *
 * Everything visual — hierarchy, assembly, inspection — lives in
 * `EvidenceExhibition`, which is the client half. The split is deliberate: the
 * allowlist check and the exhibit list are decided once on the server and
 * shipped as data, not as a filter that runs again in every browser.
 *
 * No captions are invented here. `Project.gallery` is a list of URLs and
 * nothing more, so the only text under a frame is its exhibit number and the
 * affordance that opens it. The day the schema carries a caption, it arrives as
 * a field on `EvidenceItem` and the layout already has the line to put it on.
 */

export function ProjectGallery({
  images,
  title,
  context,
  identity = DEFAULT_IDENTITY,
}: {
  images: string[];
  title: string;
  /** The chapter this sits in, carried into the viewer so context survives. */
  context?: string;
  /** Forwarded untouched: it decides the order a row assembles in, nothing else. */
  identity?: ProjectIdentity;
}) {
  const items: EvidenceItem[] = images.filter(isAllowedImageSrc).map((src, index) => ({
    src,
    alt: `${title} — screenshot ${index + 1}`,
    number: String(index + 1).padStart(2, "0"),
  }));

  if (items.length === 0) return null;

  return (
    <EvidenceExhibition items={items} title={title} context={context} identity={identity} />
  );
}
