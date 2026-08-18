import { z } from "zod";

/**
 * Tracking beacon payload.
 *
 * Everything except the path is optional and generously bounded: the browser
 * is an untrusted client, so the point is to cap what can be stored, not to
 * argue with it. A payload that fails this parse is dropped silently.
 */
export const trackSchema = z.object({
  path: z.string().trim().min(1).max(300),
  referrer: z.string().trim().max(500).optional(),
  /** "1920x1080". Anything else is discarded rather than stored. */
  screen: z
    .string()
    .trim()
    .regex(/^\d{1,5}x\d{1,5}$/)
    .optional(),
  timezone: z.string().trim().max(60).optional(),
  language: z.string().trim().max(20).optional(),
});

export type TrackInput = z.infer<typeof trackSchema>;
