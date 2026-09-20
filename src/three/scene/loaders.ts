import { useGLTF, useKTX2 } from "@react-three/drei";

/**
 * Points drei's own GLTF/Draco/Meshopt loader stack at the local decoder
 * copies `scripts/copy-decoders.mjs` writes to `public/decoders/` instead of
 * drei's default Google/CDN hosts.
 *
 * Called once, at module scope in `scene-canvas.tsx` — the code-split file
 * itself, so it only evaluates once a visitor's `three-scene` flag pulls the
 * chunk in, and always before the first child mounts and calls `useGLTF`.
 *
 * S9 requires "the same instance" for every loader drei's hooks use — that
 * instance lives inside `three-stdlib`, not `three/examples/jsm`, so this
 * file configures drei's own static loader singletons rather than
 * constructing a second, parallel `GLTFLoader`/`KTX2Loader` stack.
 * Meshopt needs no such call: `useGLTF`'s default `useMeshopt=true` already
 * wires `three-stdlib`'s `MeshoptDecoder` in per-load.
 */
export function configureSceneLoaders(): void {
  useGLTF.setDecoderPath("/decoders/draco/");
}

/** Local basis path for every `useKTX2` call in the scene — see `configureSceneLoaders`. */
const BASIS_PATH = "/decoders/basis/";

/** `useKTX2`, pinned to the local transcoder instead of drei's CDN default. */
export function useSceneKTX2<Url extends string[] | string | Record<string, string>>(
  input: Url,
): ReturnType<typeof useKTX2<Url>> {
  return useKTX2(input, BASIS_PATH);
}
useSceneKTX2.preload = (url: Parameters<typeof useKTX2.preload>[0]) => useKTX2.preload(url, BASIS_PATH);
useSceneKTX2.clear = useKTX2.clear;
