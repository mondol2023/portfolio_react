"use client";

import { ContactCalm } from "../objects/contact-calm";
import { sceneSectionEnvelope } from "../scene/camera-rig";

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
  // Waypoint index 5, the path's last. Projects → Contact is the entrance
  // span; there is no span after it, so the envelope's `exit` is always 0 and
  // this section — alone among the six — never fades back out.
  const { entry } = sceneSectionEnvelope(progress, 5);

  return <ContactCalm tone={tone} toneSoft={toneSoft} reducedMotion={reducedMotion} entryProgress={entry} />;
}
