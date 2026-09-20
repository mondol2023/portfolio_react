import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Generates `public/models/vine.glb` — garden's one skinned mesh
 * (SCENERY_SYSTEM_PLAN.md §4.3/§8, Phase J): a tapered trunk bound to a
 * ten-joint bone chain (three.js's own "rope" skin-binding technique —
 * `webgl_skinning_simple`) plus a flower-head bulb at the tip carrying a
 * `bloom` morph target. Ships as a `grow` `AnimationClip` the app scrubs by
 * scroll (`growth.tsx`), never plays.
 *
 * §17 forbids a new dependency, and this repo vendors only the Draco/Basis
 * *decoders* (`three/examples/jsm/libs`) — `DRACOExporter` and
 * `GLTFExporter` both require an *encoder* that isn't installed anywhere
 * here (`DRACOExporter` even documents needing a CDN-loaded
 * `draco_encoder.js` global; `GLTFExporter` itself has no
 * `KHR_draco_mesh_compression`/`EXT_meshopt_compression` writer at all —
 * verified by grepping the vendored copy for both). That is the same gap
 * Phase H hit for KTX2 and resolved the same way it resolves here: ship a
 * standard (uncompressed-geometry) glTF binary through the exact loader
 * path §8 requires — `loaders.ts`'s `DRACOLoader`/meshopt-enabled
 * `useGLTF` — rather than add an encoder dependency. The loader is fully
 * wired for both regardless, and will transcode a real Draco/meshopt asset
 * transparently the day one replaces this file; nothing downstream depends
 * on this file being uncompressed. Low vertex/bone counts keep the output
 * small on their own (§8's ≤400KB budget) without compression's help.
 */

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const outDir = path.join(root, "public/models");
const outPath = path.join(outDir, "vine.glb");

/**
 * `GLTFExporter`'s binary path reads the merged buffer back out through a
 * browser `FileReader` (`blob.readAsArrayBuffer`). Node has no `FileReader`
 * but does have `Blob.arrayBuffer()` (global since Node 18) — this shim is
 * local to this standalone generation script, not shipped in the app bundle.
 */
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buffer) => {
          this.result = buffer;
          this.onloadend?.();
        })
        .catch((error) => {
          this.onerror?.(error);
        });
    }
  };
}

/** Movable joints above the fixed root — stays well inside §4.3's ≤24-bone budget. */
const SEGMENTS = 10;
const BONE_COUNT = SEGMENTS + 1;
const HEIGHT = 2.6;
const BASE_RADIUS = 0.085;
const TIP_RADIUS = 0.018;
const RADIAL_SEGMENTS = 6;
const BULB_RADIUS = 0.17;

/** Clip duration is unitless (1.0) on purpose: `growth.tsx` scrubs by
 * `entryProgress` directly (`action.time = clamp01(entryProgress)`), so
 * keyframe times below are already the 0–1 fractions the scrub reads. */
const DURATION = 1;
/** Total spiral through all ten joints at the fully curled (t=0) pose — a fiddlehead-fern curl, not a right angle. */
const CURL_PER_BONE = THREE.MathUtils.degToRad(22);
/** How much of the clip elapses before the *last* joint starts unfurling — the base-to-tip wave (§ "slowly growing/unfurling"). */
const MAX_DELAY_FRACTION = 0.5;
const RAMP_FRACTION = 0.5;

function buildTrunkGeometry() {
  const geometry = new THREE.CylinderGeometry(TIP_RADIUS, BASE_RADIUS, HEIGHT, RADIAL_SEGMENTS, SEGMENTS, true);
  // Cylinder is centred on Y by default; shift so it runs 0 (root, ground) to HEIGHT (tip).
  geometry.translate(0, HEIGHT / 2, 0);
  return geometry;
}

function buildBulbGeometry() {
  const geometry = new THREE.IcosahedronGeometry(BULB_RADIUS, 1);
  geometry.translate(0, HEIGHT + BULB_RADIUS * 0.55, 0);
  return geometry;
}

/**
 * Three.js's "rope" skin-binding technique: a vertex's weight splits
 * linearly between the two bones nearest its rest-pose Y, so the mesh bends
 * smoothly along the chain instead of faceting at each joint.
 */
function bindRope(geometry, boneCount, y0, y1) {
  const position = geometry.attributes.position;
  const count = position.count;
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);

  for (let i = 0; i < count; i += 1) {
    const y = position.getY(i);
    const t = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1) * (boneCount - 1);
    const bone0 = Math.min(boneCount - 2, Math.floor(t));
    const bone1 = bone0 + 1;
    const w1 = t - bone0;

    skinIndex[i * 4 + 0] = bone0;
    skinIndex[i * 4 + 1] = bone1;
    skinWeight[i * 4 + 0] = 1 - w1;
    skinWeight[i * 4 + 1] = w1;
  }

  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));
}

/** The bulb rides entirely on the last joint — it is the tip, not a span. */
function bindFullyToBone(geometry, boneIndex) {
  const count = geometry.attributes.position.count;
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    skinIndex[i * 4] = boneIndex;
    skinWeight[i * 4] = 1;
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));
}

/** Zero offsets everywhere — the trunk itself doesn't bloom, only the bulb does. Required so `mergeGeometries` sees a consistent `morphAttributes.position` across both source geometries. */
function zeroMorph(geometry) {
  const count = geometry.attributes.position.count;
  geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3)];
}

/** Bloom: each bulb vertex flares outward along its own radial direction, biased upward at the crown — a bud opening, not a uniform inflate. */
function bloomMorph(geometry) {
  const position = geometry.attributes.position;
  const count = position.count;
  const offsets = new Float32Array(count * 3);
  const centerY = HEIGHT + BULB_RADIUS * 0.55;
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();

  for (let i = 0; i < count; i += 1) {
    v.fromBufferAttribute(position, i);
    dir.set(v.x, v.y - centerY, v.z).normalize();
    const flare = 0.55 + Math.max(0, dir.y) * 0.6;
    offsets[i * 3 + 0] = dir.x * BULB_RADIUS * flare;
    offsets[i * 3 + 1] = dir.y * BULB_RADIUS * flare * 0.7 + BULB_RADIUS * 0.3;
    offsets[i * 3 + 2] = dir.z * BULB_RADIUS * flare;
  }

  geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(offsets, 3)];
}

function buildBones() {
  const bones = [];
  let previous = new THREE.Bone();
  previous.position.y = 0;
  bones.push(previous);

  for (let i = 1; i <= SEGMENTS; i += 1) {
    const bone = new THREE.Bone();
    bone.position.y = HEIGHT / SEGMENTS;
    previous.add(bone);
    bones.push(bone);
    previous = bone;
  }

  return bones;
}

/**
 * The `grow` clip: every movable joint (bones 1..SEGMENTS — the root stays
 * fixed, it is anchored) carries a quaternion track from a curled fiddlehead
 * pose to a near-straight one, with each joint's ramp delayed a little
 * further than the last (`MAX_DELAY_FRACTION`) so the uncurl visibly travels
 * base-to-tip rather than snapping uniformly. A held first segment
 * (`[0, delay]` both at the curled value) guarantees `t=0` always reads as
 * fully curled regardless of track extrapolation.
 */
function buildGrowClip(bones) {
  const tracks = [];
  const curlAxis = new THREE.Vector3(1, 0, 0);
  const waveAxis = new THREE.Vector3(0, 0, 1);
  const curled = new THREE.Quaternion();
  const straight = new THREE.Quaternion();
  const tilt = new THREE.Quaternion();

  for (let i = 1; i <= SEGMENTS; i += 1) {
    const bone = bones[i];
    if (!bone) continue;

    curled.setFromAxisAngle(curlAxis, CURL_PER_BONE);

    straight.identity();
    if (i >= 3 && i <= 8) {
      const sign = i % 2 === 0 ? 1 : -1;
      tilt.setFromAxisAngle(waveAxis, THREE.MathUtils.degToRad(6) * sign);
      straight.copy(tilt);
    }

    const delay = (i / SEGMENTS) * MAX_DELAY_FRACTION * DURATION;
    const rampEnd = Math.min(DURATION, delay + RAMP_FRACTION * DURATION);

    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        `${bone.name}.quaternion`,
        [0, delay, rampEnd],
        [
          curled.x, curled.y, curled.z, curled.w,
          curled.x, curled.y, curled.z, curled.w,
          straight.x, straight.y, straight.z, straight.w,
        ],
      ),
    );
  }

  return new THREE.AnimationClip("grow", DURATION, tracks);
}

async function main() {
  const trunk = buildTrunkGeometry();
  const bulb = buildBulbGeometry();

  bindRope(trunk, BONE_COUNT, 0, HEIGHT);
  bindFullyToBone(bulb, SEGMENTS);
  zeroMorph(trunk);
  bloomMorph(bulb);

  const trunkFlat = trunk.index ? trunk.toNonIndexed() : trunk;
  const bulbFlat = bulb.index ? bulb.toNonIndexed() : bulb;
  const merged = mergeGeometries([trunkFlat, bulbFlat], false);
  if (!merged) throw new Error("generate-garden-vine: mergeGeometries failed — attribute sets diverged.");
  merged.morphTargetsRelative = true;

  const bones = buildBones();
  // Every bone needs a stable, unique name — the exported `.quaternion` tracks
  // above target bones by name, and `GLTFLoader` rebuilds the skeleton the
  // same way.
  bones.forEach((bone, index) => {
    bone.name = index === 0 ? "vine-root" : `vine-joint-${index}`;
  });

  // Placeholder only (S5: a scenery's own material comes from `growth.tsx`,
  // never from the asset) — kept mapless so the Node-side exporter never
  // touches its canvas/image code path.
  const material = new THREE.MeshStandardMaterial({ color: 0x3d6b3f, roughness: 0.85, metalness: 0 });

  const mesh = new THREE.SkinnedMesh(merged, material);
  mesh.name = "vine";
  mesh.morphTargetDictionary = { bloom: 0 };
  mesh.morphTargetInfluences = [0];
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));

  const growClip = buildGrowClip(bones);

  const sceneRoot = new THREE.Group();
  sceneRoot.name = "GardenVine";
  sceneRoot.add(mesh);

  const exporter = new GLTFExporter();
  const arrayBuffer = await exporter.parseAsync(sceneRoot, { binary: true, animations: [growClip] });
  const bytes = Buffer.from(arrayBuffer);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, bytes);

  const kb = (bytes.byteLength / 1024).toFixed(1);
  const budgetBytes = 400 * 1024;
  console.log(`[generate-garden-vine] vine.glb: ${kb} KB${bytes.byteLength > budgetBytes ? " OVER BUDGET" : ""}`);

  await verify(bytes);
}

/**
 * Round-trip through the app's real `GLTFLoader` (no Draco/KTX2 extensions
 * used, so the stock loader — no decoder wiring needed — is enough): confirms
 * the skin, the ten-plus-one bone skeleton, the `bloom` morph target and the
 * `grow` clip all survive, the same "verify against the real consumer, not
 * just the writer" standard Phase H held its KTX2 pair to.
 */
async function verify(bytes) {
  const loader = new GLTFLoader();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, "", resolve, reject);
  });

  let skinned = null;
  gltf.scene.traverse((child) => {
    if (child.isSkinnedMesh) skinned = child;
  });

  if (!skinned) throw new Error("verify: no SkinnedMesh in round-tripped glTF.");
  if (skinned.skeleton.bones.length !== BONE_COUNT) {
    throw new Error(`verify: expected ${BONE_COUNT} bones, got ${skinned.skeleton.bones.length}.`);
  }
  if (!skinned.morphTargetDictionary || skinned.morphTargetDictionary.bloom !== 0) {
    throw new Error("verify: `bloom` morph target missing from round-tripped mesh.");
  }
  if (!skinned.geometry.morphAttributes.position || skinned.geometry.morphAttributes.position.length !== 1) {
    throw new Error("verify: morph position attribute missing from round-tripped geometry.");
  }
  if (!gltf.animations.length || gltf.animations[0].name !== "grow") {
    throw new Error("verify: `grow` AnimationClip missing from round-tripped glTF.");
  }
  if (gltf.animations[0].tracks.length !== SEGMENTS) {
    throw new Error(`verify: expected ${SEGMENTS} quaternion tracks, got ${gltf.animations[0].tracks.length}.`);
  }

  console.log(
    `[generate-garden-vine] verified: ${skinned.skeleton.bones.length} bones, ` +
      `${gltf.animations[0].tracks.length} tracks, morph "bloom" present.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
