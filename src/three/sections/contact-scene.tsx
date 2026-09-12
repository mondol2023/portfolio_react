"use client";

import { ContactCalm } from "../objects/contact-calm";
import { sceneSectionProgress } from "../scene/camera-rig";

interface ContactSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  progress: number;
}

/**
 * Contact's slice of the persistent canvas — the last one. No content-store
 * bridge here: unlike Skills/Experience/Projects this section has no CMS data
 * to visualise, only the single calm object the spec asks for.
 */
export function ContactScene({ tone, toneSoft, reducedMotion, progress }: ContactSceneProps) {
  // Index 4 (Projects → Contact) is this section's entrance span. Contact is
  // the path's last waypoint, so unlike every earlier section-scene there is
  // no further exit span to compute or fade toward.
  const entryProgress = sceneSectionProgress(progress, 4);

  return <ContactCalm tone={tone} toneSoft={toneSoft} reducedMotion={reducedMotion} entryProgress={entryProgress} />;
}
