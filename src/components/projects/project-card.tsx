"use client";

import { type PointerEvent, useCallback, useEffect, useRef } from "react";
import { motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { isAllowedImageSrc } from "@/lib/constants/images";
import { getMonogram } from "@/lib/constants/tech-brand";
import { SPRING } from "@/lib/experience/springs";
import { SCROLL_SUSPEND_VELOCITY, useScrollVelocity } from "@/lib/experience/use-scroll-velocity";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { clearHoveredProject, publishHoveredProject } from "@/lib/store/scene-interaction-store";
import type { Project } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";
import { formatYearRange } from "@/lib/utils/dates";
import {
  MISSION_SCOPE_LABELS,
  PROJECT_STATUS_LABELS,
  missionScope,
  projectStatus,
  type ProjectStatus,
} from "@/lib/utils/project-status";

/**
 * Project card.
 *
 * The whole card is one link: a stretched overlay over the article rather than
 * nested anchors, so there is exactly one tab stop and the focus ring wraps the
 * entire card. Tech tags are plain text, not links, for the same reason.
 *
 * On a fine pointer with no reduced-motion preference, the card also tilts:
 * rotateX/rotateY track the pointer and a shared `tiltZ` spring drives each
 * layer's `translateZ` by its own depth weight, so the surface reads as a
 * stack of physical planes rather than a flat image with a hover state. Pure
 * CSS/DOM — `transform-style: preserve-3d`, no WebGL. Touch and reduced
 * motion fall back to the original static hover treatment untouched.
 */

const MAX_TAGS = 4;

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  live: "success",
  "in-progress": "warning",
  shipped: "neutral",
};

/** Pointer-driven rotation ceiling, in degrees. */
const ROTATE_X_DEG = 4;
const ROTATE_Y_DEG = 6;
/** Shared depth budget, in px — each layer moves `weight * this` along Z. */
const TILT_Z_PX = 24;

/** Depth weight per layer (plan §6): background recedes, foreground pops. */
const LAYER_DEPTH = {
  image: -1,
  metadata: 0.1,
  title: 0.2,
  cta: 0.3,
} as const;

interface ProjectCardProps {
  project: Project;
  /** Larger treatment used for the first card in the featured grid. */
  emphasis?: boolean;
  /** Set on the first card above the fold so its image is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}

export function ProjectCard({
  project,
  emphasis = false,
  priority = false,
  className,
}: ProjectCardProps) {
  const year = formatYearRange(project.startDate, project.endDate);
  const visibleTags = project.technologies.slice(0, MAX_TAGS);
  const hiddenTags = project.technologies.length - visibleTags.length;
  const status = projectStatus(project);
  const scope = missionScope(project);

  // Both hooks must run unconditionally on every render — the `&&` above
  // would short-circuit the second call and break rules-of-hooks.
  const finePointer = useFinePointer();
  const reducedMotion = useMotionPreference();
  const tiltEnabled = finePointer && !reducedMotion;

  const rotateXTarget = useMotionValue(0);
  const rotateYTarget = useMotionValue(0);
  const tiltZTarget = useMotionValue(0);
  const lightXTarget = useMotionValue(50);
  const lightYTarget = useMotionValue(50);

  // Rotation "enters" quickly (lighter, snappy); the Z lift "returns" a beat
  // slower (heavier, weightier) — response scales with perceived mass (§7).
  const rotateX = useSpring(rotateXTarget, SPRING.snappy);
  const rotateY = useSpring(rotateYTarget, SPRING.snappy);
  const tiltZ = useSpring(tiltZTarget, SPRING.panel);
  // The sweep visibly lags the pointer rather than tracking it 1:1.
  const lightX = useSpring(lightXTarget, SPRING.trail);
  const lightY = useSpring(lightYTarget, SPRING.trail);

  // Tilt is pointer-driven, not scroll-driven, but a fast flick over a card
  // shouldn't leave five springs integrating toward stale targets (S14.3) —
  // the same gate §7's cursor aura and §6.2's raycaster suspend on later.
  const scrollVelocity = useScrollVelocity();
  const suspendedRef = useRef(false);
  useMotionValueEvent(scrollVelocity, "change", (velocity) => {
    const suspended = velocity > SCROLL_SUSPEND_VELOCITY;
    if (suspended === suspendedRef.current) return;
    suspendedRef.current = suspended;
    if (suspended) {
      rotateX.jump(0);
      rotateY.jump(0);
      tiltZ.jump(0);
    }
  });

  const imageZ = useTransform(tiltZ, (v) => v * LAYER_DEPTH.image);
  const metadataZ = useTransform(tiltZ, (v) => v * LAYER_DEPTH.metadata);
  const titleZ = useTransform(tiltZ, (v) => v * LAYER_DEPTH.title);
  const ctaZ = useTransform(tiltZ, (v) => v * LAYER_DEPTH.cta);
  const sweepBackground = useTransform([lightX, lightY], ([x, y]) =>
    `radial-gradient(360px circle at ${x}% ${y}%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 70%)`,
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (suspendedRef.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const px = (event.clientX - bounds.left) / bounds.width - 0.5;
      const py = (event.clientY - bounds.top) / bounds.height - 0.5;
      rotateXTarget.set(py * -ROTATE_X_DEG * 2);
      rotateYTarget.set(px * ROTATE_Y_DEG * 2);
      tiltZTarget.set(TILT_Z_PX);
      lightXTarget.set((px + 0.5) * 100);
      lightYTarget.set((py + 0.5) * 100);
    },
    [rotateXTarget, rotateYTarget, tiltZTarget, lightXTarget, lightYTarget],
  );

  const handlePointerLeave = useCallback(() => {
    rotateXTarget.set(0);
    rotateYTarget.set(0);
    tiltZTarget.set(0);
  }, [rotateXTarget, rotateYTarget, tiltZTarget]);

  // Hand-off to the 3D deck behind the page, on the same imperative-store
  // pattern the skill pills use: the canvas is `pointer-events-none` and
  // cannot raycast a card, so the card has to say which project it is. Wired
  // unconditionally — unlike the tilt, this is not a fine-pointer effect, the
  // publisher applies that gate itself — and on focus as well as hover, so a
  // keyboard reaches the same reaction.
  const announce = useCallback(() => publishHoveredProject(project.id), [project.id]);
  const withdraw = useCallback(() => clearHoveredProject(project.id), [project.id]);

  // A scenery switch swaps this card for `PlansheetCard` mid-hover, and an
  // unmounted card never gets its `pointerleave` — without this the scene
  // would hold a highlight on a card that no longer exists.
  useEffect(() => withdraw, [withdraw]);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface",
        "transition-[border-color,box-shadow] duration-300",
        "hover:border-border-strong hover:shadow-elevated focus-within:border-border-strong",
        !tiltEnabled && "motion-safe:hover:-translate-y-1",
        className,
      )}
      style={tiltEnabled ? { perspective: "1400px" } : undefined}
      onPointerMove={tiltEnabled ? handlePointerMove : undefined}
      onPointerEnter={announce}
      onPointerLeave={() => {
        if (tiltEnabled) handlePointerLeave();
        withdraw();
      }}
      onFocus={announce}
      onBlur={withdraw}
    >
      <motion.div
        className="flex flex-1 flex-col"
        style={tiltEnabled ? { transformStyle: "preserve-3d", rotateX, rotateY } : undefined}
      >
        <motion.div
          className={cn(
            "relative overflow-hidden border-b border-border bg-bg-subtle",
            emphasis ? "aspect-[16/10]" : "aspect-[16/9]",
          )}
          style={tiltEnabled ? { translateZ: imageZ } : undefined}
        >
          {isAllowedImageSrc(project.featuredImage) ? (
            <Image
              src={project.featuredImage}
              alt=""
              fill
              priority={priority}
              sizes={emphasis ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
              className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            // Placeholder rather than a broken frame: initials on the section grid.
            <div className="surface-grid absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-5xl text-fg-subtle/60">
                {getMonogram(project.title)}
              </span>
            </div>
          )}
        </motion.div>

        <div className={cn("relative flex flex-1 flex-col p-6", emphasis && "sm:p-8")}>
          {tiltEnabled ? (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: sweepBackground }}
            />
          ) : null}

          <motion.p
            className="label-mono relative flex items-center gap-3"
            style={tiltEnabled ? { translateZ: metadataZ } : undefined}
          >
            <span>{project.type}</span>
            {year ? (
              <>
                <span aria-hidden="true" className="h-px w-4 bg-border-strong" />
                <span>{year}</span>
              </>
            ) : null}
          </motion.p>

          {/*
           * "Mission" framing kept to two small badges, not a renamed heading or
           * a rewritten description — a recruiter skimming this card should still
           * read "live project, uses a lot of tech," just with game-flavored
           * labels rather than plain ones.
           */}
          <motion.p
            className="relative mt-3 flex flex-wrap items-center gap-2"
            style={tiltEnabled ? { translateZ: metadataZ } : undefined}
          >
            <Badge variant={STATUS_VARIANT[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
            <Badge variant="outline">{MISSION_SCOPE_LABELS[scope]}</Badge>
          </motion.p>

          <motion.h3
            className={cn(
              "relative mt-4 font-semibold tracking-tight text-fg",
              emphasis ? "text-2xl sm:text-3xl" : "text-xl",
            )}
            style={tiltEnabled ? { translateZ: titleZ } : undefined}
          >
            <Link
              href={`/projects/${project.slug}`}
              // Stretched link: covers the card without nesting interactive elements.
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {project.title}
              <span className="sr-only"> — read the case study</span>
            </Link>
          </motion.h3>

          <p className="relative mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">
            {project.shortDescription}
          </p>

          {visibleTags.length > 0 ? (
            <ul className="relative mt-6 flex flex-wrap gap-2">
              {visibleTags.map((tech) => (
                <li key={tech}>
                  <Badge variant="outline">{tech}</Badge>
                </li>
              ))}
              {hiddenTags > 0 ? (
                <li>
                  <Badge variant="outline">+{hiddenTags} more</Badge>
                </li>
              ) : null}
            </ul>
          ) : null}

          <motion.span
            aria-hidden="true"
            className="relative mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-accent transition-transform motion-safe:group-hover:translate-x-1"
            style={tiltEnabled ? { translateZ: ctaZ } : undefined}
          >
            Read case study
            <ArrowUpRight className="size-4" />
          </motion.span>
        </div>
      </motion.div>
    </article>
  );
}
