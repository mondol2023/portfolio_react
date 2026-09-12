import type { SceneBudget } from "@/lib/experience/device-tier";

interface SceneLightingProps {
  /** Current section's `--tone` colour, as a resolved hex/rgb string. */
  tone: string;
  /** Current section's `--tone-soft` colour. */
  toneSoft: string;
  budget: SceneBudget;
}

/**
 * One coherent lighting rig, shared by every section's objects: a soft key,
 * a weak fill from behind, and one rim light tinted in the current section's
 * tone. Sections change what the light falls on and how strong the tint
 * reads — never how the rig itself is built — matching the spec's "one
 * coherent global rig," not a per-section relight or colour cycle.
 */
export function SceneLighting({ tone, toneSoft, budget }: SceneLightingProps) {
  return (
    <>
      <ambientLight intensity={0.35} color={toneSoft} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} color="#ffffff" castShadow={budget.shadows} />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} color={toneSoft} />
      {/* The one accent light — tinted in the section tone, never a rainbow cycle. */}
      <pointLight position={[-2, 1, -4]} intensity={0.6} color={tone} distance={12} decay={2} />
    </>
  );
}
