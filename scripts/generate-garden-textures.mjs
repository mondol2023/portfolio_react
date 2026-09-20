import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDefaultContainer,
  read as readKtx2,
  write as writeKtx2,
  KHR_DF_MODEL_RGBSDA,
  KHR_DF_PRIMARIES_BT709,
  KHR_DF_PRIMARIES_UNSPECIFIED,
  KHR_DF_TRANSFER_LINEAR,
  KHR_DF_TRANSFER_SRGB,
  KHR_SUPERCOMPRESSION_NONE,
  VK_FORMAT_R8G8B8A8_UNORM,
} from "three/examples/jsm/libs/ktx-parse.module.js";

/**
 * Generates garden's leaf colour map (mottled green, veined) and tangent-space
 * normal map, as raw (non-Basis) KTX2 binaries — the second asset-pipeline
 * payload for SCENERY_SYSTEM_PLAN.md §8/§4.3, following Phase H's
 * `generate-observatory-textures.mjs` exactly.
 *
 * Same honest limitation as Phase H: no UASTC/Basis encoder lives in this
 * repo and §17 forbids adding one, so this packs plain RGBA8 pixels into a
 * valid, non-supercompressed KTX2 container. `KTX2Loader._createTexture`
 * branches on `vkFormat !== VK_FORMAT_UNDEFINED` and calls `createRawTexture()`
 * directly for a raw format like this one — no Basis transcoder involved, so
 * it loads through the exact same loader path §8 requires. 240x240 keeps both
 * files under the ≤250KB/texture budget (uncompressed RGBA8 is ~8x larger per
 * pixel than real UASTC).
 *
 * Unlike the ORM/normal pair, the colour map is real colour data: its
 * `dataFormatDescriptor` declares `BT709` primaries and an `SRGB` transfer
 * function, so `KTX2Loader.parseColorSpace()` resolves it to
 * `SRGBColorSpace` on its own — `growth.tsx` still sets `.colorSpace`
 * explicitly on load per S5, but the container is honest either way. The
 * normal map keeps Phase H's `UNSPECIFIED`/`LINEAR` pair (`NoColorSpace`).
 */

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const outDir = path.join(root, "public/textures");

const SIZE = 240;
const BUDGET_BYTES = 250 * 1024;

/** mulberry32 — duplicated for the same reason `generate-observatory-textures.mjs` duplicates it: this is a standalone Node script, not part of the TS app bundle. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * A leaf's own height field: a central vein running along Y, thinner
 * secondary veins branching off it at an angle, and low-frequency mottling
 * between them — veins read as slightly raised ridges, mottling as shallow
 * surface variation. Shared between the colour and normal generators so the
 * normal map's tilt always matches what the colour map is describing.
 */
function veinHeight(x, y, size, rand) {
  const u = (x / size) * 2 - 1; // -1..1 across the leaf's width
  const v = y / size; // 0..1 along the leaf's length

  const midrib = Math.exp(-(u * u) / 0.006);

  let secondary = 0;
  for (let vein = 1; vein <= 4; vein += 1) {
    const along = vein / 5;
    const spread = 0.16 + (1 - v) * 0.1;
    const offset = u - Math.sign(u || 1) * spread * Math.abs(v - along) * 3.2;
    secondary += Math.exp(-(offset * offset) / 0.0015) * (v > along - 0.28 && v < along + 0.05 ? 1 : 0);
  }

  const mottle = Math.sin(x * 0.12 + y * 0.05) * 0.5 + Math.sin(x * 0.03 - y * 0.09) * 0.5;
  const grain = (rand() - 0.5) * 0.25;

  return midrib * 0.7 + secondary * 0.4 + mottle * 0.12 + grain * 0.05;
}

function generateLeafColor(size, seed) {
  const rand = seededRandom(seed);
  const data = new Uint8Array(size * size * 4);

  // Two greens: a darker base between the veins, a brighter one along them —
  // §4.3's "soft green bounce" read as pigment rather than as lighting.
  const baseGreen = { r: 46, g: 92, b: 48 };
  const veinGreen = { r: 116, g: 168, b: 84 };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const h = veinHeight(x, y, size, rand);
      const t = clamp255(h * 255) / 255;
      const i = (y * size + x) * 4;

      data[i + 0] = clamp255(lerp(baseGreen.r, veinGreen.r, t));
      data[i + 1] = clamp255(lerp(baseGreen.g, veinGreen.g, t));
      data[i + 2] = clamp255(lerp(baseGreen.b, veinGreen.b, t));
      data[i + 3] = 255;
    }
  }

  return data;
}

function generateLeafNormal(size, seed) {
  const rand = seededRandom(seed);
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      heights[y * size + x] = veinHeight(x, y, size, rand);
    }
  }
  const at = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];

  const strength = 1.6;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = 1 / len;

      const i = (y * size + x) * 4;
      data[i + 0] = clamp255((nx * 0.5 + 0.5) * 255);
      data[i + 1] = clamp255((ny * 0.5 + 0.5) * 255);
      data[i + 2] = clamp255((nz * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }

  return data;
}

function packKtx2(pixels, size, { primaries, transfer }) {
  const container = createDefaultContainer();
  container.vkFormat = VK_FORMAT_R8G8B8A8_UNORM;
  container.typeSize = 1;
  container.pixelWidth = size;
  container.pixelHeight = size;
  container.pixelDepth = 0;
  container.layerCount = 0;
  container.faceCount = 1;
  container.levelCount = 1;
  container.supercompressionScheme = KHR_SUPERCOMPRESSION_NONE;
  container.levels = [{ levelData: pixels, uncompressedByteLength: pixels.byteLength }];

  const dfd = container.dataFormatDescriptor[0];
  dfd.colorModel = KHR_DF_MODEL_RGBSDA;
  dfd.colorPrimaries = primaries;
  dfd.transferFunction = transfer;
  dfd.bytesPlane = [4, 0, 0, 0, 0, 0, 0, 0];

  return writeKtx2(container);
}

function writeAndVerify(name, bytes, expectedColorSpaceHint) {
  const outPath = path.join(outDir, name);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, bytes);

  const roundTrip = readKtx2(bytes);
  if (roundTrip.vkFormat !== VK_FORMAT_R8G8B8A8_UNORM) {
    throw new Error(`${name}: round-trip vkFormat mismatch`);
  }
  if (roundTrip.pixelWidth !== SIZE || roundTrip.pixelHeight !== SIZE) {
    throw new Error(`${name}: round-trip dimensions mismatch`);
  }

  const kb = (bytes.byteLength / 1024).toFixed(1);
  const overBudget = bytes.byteLength > BUDGET_BYTES ? " OVER BUDGET" : "";
  console.log(`[generate-garden-textures] ${name}: ${kb} KB (${expectedColorSpaceHint})${overBudget}`);
}

const colorPixels = generateLeafColor(SIZE, 0x9a2d_e101);
const normalPixels = generateLeafNormal(SIZE, 0x9a2d_e102);

writeAndVerify(
  "leaf-color.ktx2",
  packKtx2(colorPixels, SIZE, { primaries: KHR_DF_PRIMARIES_BT709, transfer: KHR_DF_TRANSFER_SRGB }),
  "sRGB",
);
writeAndVerify(
  "leaf-normal.ktx2",
  packKtx2(normalPixels, SIZE, { primaries: KHR_DF_PRIMARIES_UNSPECIFIED, transfer: KHR_DF_TRANSFER_LINEAR }),
  "NoColorSpace",
);
