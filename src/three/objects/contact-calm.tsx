"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface ContactCalmProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  /** 0 at rest in Projects, 1 once the camera has fully arrived at Contact. Contact is the path's last waypoint, so there is no exit span to fade back out toward — the object simply settles in and stays. */
  entryProgress: number;
}

/** Degrees/second the shell rotates at rest — Hero's sculpture turns roughly every 14s; this is nearly four times slower, the visual equivalent of the site exhaling. */
const ROTATION_PERIOD_SECONDS = 52;
/** Radius of the dark shell that reads as the whole scene quietly dimming, rendered `BackSide` so it wraps the viewer rather than occluding the calm object it surrounds. */
const VIGNETTE_RADIUS = 17;

/**
 * Contact's identity per the spec: the scene quiets. Every earlier section
 * added something (a sculpture, a fragmentation, a graph, a timeline, a
 * fanned deck) — this one is the release after that build, so it adds a
 * single dodecahedron (the one Platonic-solid family none of the previous
 * sections used) turning far slower than Hero's sculpture ever did, breathing
 * at a barely-there amplitude, with no mouse parallax and no hover — "the
 * journey is ending" reads as the scene finally holding still, not as one
 * more reactive object. Rather than touching the shared lighting rig (every
 * other section changes only what light falls on, never the rig itself), the
 * "darker" half of the brief is a large dark shell fading in behind it —
 * self-contained to this section like every other phase's fade, it dims the
 * whole view perceptually without altering a single shared light's values.
 */
export function ContactCalm({ tone, toneSoft, reducedMotion, entryProgress }: ContactCalmProps) {
  // Darkened rather than raw `toneSoft` — the vignette needs to read as the
  // scene actually dimming, not merely re-tinting, while still staying on
  // the section's own colour rather than jumping to a hardcoded neutral.
  const vignetteColor = useMemo(() => new THREE.Color(toneSoft).multiplyScalar(0.12), [toneSoft]);

  const coreRef = useRef<THREE.Mesh>(null);
  const vignetteRef = useRef<THREE.Mesh>(null);
  const vignetteMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    const core = coreRef.current;
    const vignette = vignetteRef.current;
    if (!core || !vignette) return;

    const settle = THREE.MathUtils.smoothstep(entryProgress, 0, 1);

    if (!reducedMotion) {
      core.rotation.y += ((Math.PI * 2) / ROTATION_PERIOD_SECONDS) * delta;
      core.rotation.x += ((Math.PI * 2) / ROTATION_PERIOD_SECONDS / 3) * delta;
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
      core.scale.setScalar(breathe * settle);
    } else {
      core.scale.setScalar(settle);
    }

    vignette.scale.setScalar(settle);
    if (vignetteMaterialRef.current) {
      vignetteMaterialRef.current.opacity = settle * 0.55;
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <dodecahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial color={toneSoft} emissive={tone} emissiveIntensity={0.25} metalness={0.3} roughness={0.6} />
      </mesh>

      <mesh ref={vignetteRef} scale={0}>
        <sphereGeometry args={[VIGNETTE_RADIUS, 32, 32]} />
        <meshBasicMaterial
          ref={vignetteMaterialRef}
          color={vignetteColor}
          side={THREE.BackSide}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
