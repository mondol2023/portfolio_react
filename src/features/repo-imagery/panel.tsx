"use client";

import { Check, ImagePlus, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import { noteStockUsageAction, suggestRepoImageryAction } from "./actions";
import { parseRepoRef } from "./repo-url";
import type { CandidateSource, ImageCandidate, RepoImagerySuggestion } from "./types";

/**
 * The admin panel: paste a GitHub URL, get images to pick from.
 *
 * Deliberately ignorant of react-hook-form. It takes the current values as
 * plain props and hands changes back through two callbacks, which is what keeps
 * the wiring in `project-form.tsx` down to a handful of lines — and what makes
 * removing the feature a deletion rather than an untangling.
 *
 * (It also avoids `watch()`. The form passes values in from `useWatch`, which
 * does not trip the `react-hooks/incompatible-library` rule.)
 */

/** Matches the `max(12)` on `gallery` in the project schema. */
const GALLERY_MAX = 12;

const GROUPS: { source: CandidateSource; title: string; blurb: string }[] = [
  {
    source: "generated",
    title: "Generated covers",
    blurb: "Drawn on this server from the repository's name, description and topics.",
  },
  {
    source: "repo",
    title: "From the repository",
    blurb: "Screenshots committed to the README, and GitHub's own social card.",
  },
  {
    source: "stock",
    title: "Related photos",
    blurb: "Free photography from Unsplash, matched to the repository's topics.",
  },
];

interface RepoImageryPanelProps {
  /** The form's current `githubUrl`. */
  repoUrl: string;
  /** The form's current `featuredImage`, so applied tiles can be marked. */
  featuredImage: string;
  gallery: string[];
  onUseCover: (url: string) => void;
  onGalleryChange: (urls: string[]) => void;
}

function Tile({
  candidate,
  isCover,
  inGallery,
  onUseCover,
  onAddToGallery,
}: {
  candidate: ImageCandidate;
  isCover: boolean;
  inGallery: boolean;
  onUseCover: () => void;
  onAddToGallery: () => void;
}) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="relative aspect-video bg-surface-hover">
        {/*
          A plain <img>, not next/image: these previews include hosts that are
          not allow-listed, which the optimiser refuses outright. A broken
          preview inside the admin is information; a thrown error is not.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
        <img
          src={candidate.url}
          alt={candidate.label}
          loading="lazy"
          decoding="async"
          // Keeps the admin URL out of third-party server logs.
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
        {isCover ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-[11px] font-medium text-accent-fg">
            <Check className="size-3" aria-hidden />
            Cover
          </span>
        ) : null}
      </div>

      <figcaption className="flex flex-col gap-1 px-3 pt-2">
        <span className="truncate text-sm font-medium text-fg" title={candidate.label}>
          {candidate.label}
        </span>
        {candidate.detail ? (
          <span className="truncate text-xs text-fg-muted">{candidate.detail}</span>
        ) : null}
        {!candidate.renderable ? (
          <span className="text-xs text-danger">
            Host not allow-listed — add it to next.config.ts to use this image.
          </span>
        ) : null}
      </figcaption>

      <div className="mt-2 flex gap-2 px-3 pb-3">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={!candidate.renderable || isCover}
          onClick={onUseCover}
        >
          {isCover ? "Cover" : "Use as cover"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!candidate.renderable || inGallery}
          onClick={onAddToGallery}
          aria-label={inGallery ? "Already in gallery" : "Add to gallery"}
          title={inGallery ? "Already in gallery" : "Add to gallery"}
        >
          {inGallery ? <Check className="size-4" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
        </Button>
      </div>
    </figure>
  );
}

export function RepoImageryPanel({
  repoUrl,
  featuredImage,
  gallery,
  onUseCover,
  onGalleryChange,
}: RepoImageryPanelProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<RepoImagerySuggestion | null>(null);

  // Parsed on every keystroke rather than on submit, so the button explains
  // itself before a round trip rather than after one.
  const ref = useMemo(() => parseRepoRef(repoUrl), [repoUrl]);

  const inGallery = useMemo(() => new Set(gallery), [gallery]);

  function find() {
    if (!ref) return;

    startTransition(async () => {
      const result = await suggestRepoImageryAction(repoUrl);

      if (result.status === "error") {
        setSuggestion(null);
        toast({ variant: "error", title: "Could not read that repository", description: result.message });
        return;
      }

      setSuggestion(result.data);
      if (result.data.candidates.length === 0) {
        toast({ variant: "info", title: "Nothing to suggest", description: "No images could be built for that repository." });
      }
    });
  }

  /** Unsplash asks to be told when a photo is actually taken, not merely shown. */
  function reportUsage(candidate: ImageCandidate) {
    if (candidate.source !== "stock" || !candidate.usageUrl) return;
    void noteStockUsageAction(candidate.usageUrl);
  }

  // Not `useCover`: a `use…` name makes every lint rule treat it as a hook.
  function applyCover(candidate: ImageCandidate) {
    onUseCover(candidate.url);
    reportUsage(candidate);
  }

  function addToGallery(candidate: ImageCandidate) {
    if (inGallery.has(candidate.url)) return;

    if (gallery.length >= GALLERY_MAX) {
      toast({
        variant: "error",
        title: "Gallery is full",
        description: `A project can hold ${GALLERY_MAX} screenshots. Remove one first.`,
      });
      return;
    }

    onGalleryChange([...gallery, candidate.url]);
    reportUsage(candidate);
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-surface-hover/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
            <Sparkles className="size-4 text-accent" aria-hidden />
            Images from the repository
          </h3>
          <p className="max-w-prose text-xs text-fg-muted">
            Fill in the source code URL above, then generate covers from the repository&rsquo;s own
            details or pull screenshots straight out of its README.
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={find}
          isLoading={isPending}
          loadingLabel="Reading repository"
          disabled={!ref}
          title={ref ? undefined : "Enter a GitHub repository URL above first"}
        >
          {suggestion ? "Refresh suggestions" : "Find images"}
        </Button>
      </div>

      {suggestion ? (
        <p className="text-xs text-fg-muted">
          <span className="font-mono text-fg">
            {suggestion.repo.owner}/{suggestion.repo.repo}
          </span>
          {suggestion.repo.description !== "" ? ` — ${suggestion.repo.description}` : null}
        </p>
      ) : null}

      {suggestion
        ? GROUPS.map((group) => {
            const items = suggestion.candidates.filter(
              (candidate) => candidate.source === group.source,
            );
            if (items.length === 0) return null;

            return (
              <div key={group.source} className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                    {group.title}
                  </h4>
                  <p className="text-xs text-fg-subtle">{group.blurb}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((candidate) => (
                    <Tile
                      key={candidate.id}
                      candidate={candidate}
                      isCover={featuredImage === candidate.url}
                      inGallery={inGallery.has(candidate.url)}
                      onUseCover={() => applyCover(candidate)}
                      onAddToGallery={() => addToGallery(candidate)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        : null}

      {suggestion && suggestion.notes.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-fg-muted">
          {suggestion.notes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
