"use client";

import { OrbitControls } from "@react-three/drei";

/**
 * §6.3's free-orbit camera — the first consumer of `@react-three/drei` in the
 * codebase (already installed, so this adds no dependency). Mounted only
 * while Inspect mode is active: `CameraRig` cedes the camera on the same
 * condition, and unmounting rather than disabling means a stray listener can
 * never survive past the mode it belongs to.
 */
export function InspectControls() {
  return <OrbitControls enableDamping dampingFactor={0.1} enablePan={false} makeDefault />;
}
