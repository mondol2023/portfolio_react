import type { SceneBudget } from "@/lib/experience/device-tier";
import type { ScenePalette } from "@/lib/experience/scene-palette";

interface SceneLightingProps {
  palette: ScenePalette;
  budget: SceneBudget;
}

/**
 * One coherent lighting rig, shared by every section's objects: a soft key
 * from the upper right, a weak tinted fill from behind and below, a rim light
 * in the section accent, and one accent point. Sections change what the light
 * falls on and how strong the tint reads — never how the rig is built —
 * matching the spec's "one coherent global rig," not a per-section relight or
 * a colour cycle.
 *
 * Two things changed once `scene-palette.ts` existed. The rig no longer
 * lights the world with two copies of the same saturated accent (the old
 * `toneSoft` prop was `--tone-soft` with its alpha silently dropped), and it
 * now balances for the theme: a near-white page reflects most of what hits
 * it and needs a strong key with heavy ambient to keep geometry from reading
 * as a dark smudge, while a near-black page needs the opposite — low ambient
 * and a hot rim — or every object dissolves into the background.
 */
export function SceneLighting({ palette, budget }: SceneLightingProps) {
  const { dark } = palette;

  return (
    <>
      <ambientLight intensity={dark ? 0.22 : 0.58} color={palette.wash} />

      {/* Key. The only shadow caster, and only where the budget allows one:
          a second render pass per frame buys inter-object shadowing that is
          worth it on a desktop GPU and nowhere else. */}
      <directionalLight
        position={[3.6, 4.4, 4.2]}
        intensity={dark ? 1.3 : 1.6}
        color={palette.key}
        castShadow={budget.shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={36}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />

      {/* Fill: weak, from the opposite corner, tinted rather than grey so the
          shadow side still belongs to the section rather than going neutral. */}
      <directionalLight position={[-4.5, -1.6, -2.4]} intensity={dark ? 0.32 : 0.3} color={palette.fill} />

      {/* Rim/back light — what separates a silhouette from the background, and
          the one place the accent is allowed to run at full strength. Carries
          more on a light page than it used to: Projects' corridor panels are
          deliberately darker than the paper behind them, and without a lit
          leading edge a dark slab on near-white is a hole rather than a
          surface. */}
      <directionalLight position={[-1.5, 2.2, -5.5]} intensity={dark ? 0.9 : 0.64} color={palette.accent} />

      {/* The single accent point, close enough to fall off visibly across a
          section's geometry rather than reading as more ambient. */}
      <pointLight position={[-2, 1, -4]} intensity={dark ? 0.75 : 0.45} color={palette.accent} distance={14} decay={2} />
    </>
  );
}
