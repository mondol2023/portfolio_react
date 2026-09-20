import { Component, Suspense, type ReactNode } from "react";

/**
 * S10: every loaded asset has a procedural fallback, and a missing/failed
 * asset must never leave a broken Suspense boundary — "a Suspense boundary
 * that throws is a broken site; a fallback that looks deliberate is not."
 *
 * `useGLTF`/`useSceneKTX2` (loaders.ts) both throw into Suspense while
 * loading and rethrow on failure, same as any `useLoader` call. This is a
 * second, per-asset error boundary — distinct from `scene-root.tsx`'s
 * `SceneErrorBoundary`, which only catches whole-canvas WebGL failures —
 * scoped around one section's loaded mesh/material so one bad asset falls
 * back to that section's procedural stand-in instead of losing the canvas.
 *
 * Usage: wrap the loaded variant, give `fallback` the procedural one.
 *
 *   <AssetBoundary assetId="observatory-orm" fallback={<ProceduralOrb />}>
 *     <LoadedOrb />
 *   </AssetBoundary>
 */

// Logged once per asset per session — a retry-happy dev toggling scenery
// back and forth shouldn't spam the console for the same failure.
const warned = new Set<string>();

interface AssetErrorBoundaryProps {
  assetId: string;
  fallback: ReactNode;
  children: ReactNode;
}

class AssetErrorBoundary extends Component<AssetErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    if (warned.has(this.props.assetId)) return;
    warned.add(this.props.assetId);
    console.warn(`[scenery] asset "${this.props.assetId}" failed to load, using procedural fallback`, error);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface AssetBoundaryProps {
  /** Stable id for this asset slot, used to de-duplicate the one-time warning. */
  assetId: string;
  /** The scenery's procedural stand-in — shown while loading and on failure alike. */
  fallback: ReactNode;
  children: ReactNode;
}

/** Suspense (loading) + error boundary (failure), both resolving to the same procedural fallback. */
export function AssetBoundary({ assetId, fallback, children }: AssetBoundaryProps) {
  return (
    <AssetErrorBoundary assetId={assetId} fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </AssetErrorBoundary>
  );
}
