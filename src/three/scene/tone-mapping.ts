import * as THREE from "three";

import type { ToneMappingId } from "@/lib/experience/scenery";

/**
 * `scenery.ts` stays `three`-free (S3), so the `ToneMappingId` → `THREE.*
 * ToneMapping` mapping lives here instead, on the code-split side of the
 * `next/dynamic` boundary alongside the rest of `src/three`.
 */
const TONE_MAPPINGS: Record<ToneMappingId, THREE.ToneMapping> = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
  none: THREE.NoToneMapping,
};

export function resolveToneMapping(id: ToneMappingId): THREE.ToneMapping {
  return TONE_MAPPINGS[id];
}
