"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { isAllowedImageSrc } from "@/lib/constants/images";
import { cn } from "@/lib/utils/cn";

/** How long each photo stays fully visible before the next one takes over. */
const SWITCH_INTERVAL_MS = 9000;

/**
 * The hero's photographic element(s).
 *
 * Every other section's scenery is procedural (`river-path`, an opt-in
 * surprise effect — see `@/components/surprise/effects`) — real photos only
 * ever appear here, and only the ones in `settings.heroImageUrls` that point
 * at a host `next/image` is configured to optimise (`isAllowedImageSrc`). That
 * is a deliberate licensing boundary: this component never receives anything
 * but URLs the admin typed in, so it cannot accidentally ship a photo nobody
 * checked the rights on.
 *
 * One photo renders statically. Two or more are all mounted at once and
 * cross-fade on a timer — simpler and avoids an image re-fetch (and the
 * blank-frame flash that comes with it) on every switch, and there are only
 * ever a handful of these. The switch itself is not gated behind
 * `prefers-reduced-motion`: it is a content change, not motion. Only the
 * animated parts are — the crossfade transition is `motion-safe:` only (an
 * instant cut otherwise), and each photo's slow Ken-Burns drift
 * (`hero-photo-drift` in globals.css) is stopped outright there too.
 *
 * A client component (the rotation needs a timer), unlike the rest of `Hero`.
 *
 * Renders nothing when `srcs` is empty (or none pass the host check), which is
 * what keeps `Hero` renderable — and exactly as before — on a fresh clone with
 * no settings configured yet.
 */
export function HeroPhoto({ srcs }: { srcs: string[] }) {
  const allowed = srcs.filter((src) => isAllowedImageSrc(src));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (allowed.length < 2) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % allowed.length);
    }, SWITCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [allowed.length]);

  if (allowed.length === 0) return null;

  return (
    // No z-index of its own: the caller already positions this behind its
    // content (`Hero`'s wrapping `-z-10` layer), and adding another here would
    // only matter if this ever had a sibling to out-rank inside that layer.
    <div className="absolute inset-0 overflow-hidden">
      {allowed.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={cn(
            "hero-photo-img absolute inset-0 object-cover",
            "motion-safe:transition-opacity motion-safe:duration-1000",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {/* Fades the photo into `--bg` at every edge, so a hero with no grid or
          glow behind it still reads as part of the same page. */}
      <div className="hero-photo-scrim absolute inset-0" />
    </div>
  );
}
