"use client";

import { ContactCalm } from "../objects/contact-calm";

interface ContactSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
}

/**
 * Contact's slice of the persistent canvas — the last one. No content-store
 * bridge here: unlike Skills/Experience/Projects this section has no CMS data
 * to visualise, only the single calm object the spec asks for.
 */
export function ContactScene({ tone, toneSoft, reducedMotion }: ContactSceneProps) {
  // Waypoint index 5, the path's last. Experience → Contact is the entrance
  // span; there is no span after it, so the envelope's `exit` is always 0 and
  // this section — alone among the six — never fades back out.
  return <ContactCalm tone={tone} toneSoft={toneSoft} reducedMotion={reducedMotion} sectionIndex={5} />;
}
