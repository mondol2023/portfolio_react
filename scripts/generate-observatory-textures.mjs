import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDefaultContainer,
  read as readKtx2,
  write as writeKtx2,
  KHR_DF_MODEL_RGBSDA,
  KHR_DF_PRIMARIES_UNSPECIFIED,
  KHR_DF_TRANSFER_LINEAR,
  KHR_SUPERCOMPRESSION_NONE,
  VK_FORMAT_R8G8B8A8_UNORM,
} from "three/examples/jsm/libs/ktx-parse.module.js";

/**
 * Generates observatory's brushed-metal ORM (R=AO, G=roughness, B=metalness)
 * and tangent-space normal map, as raw (non-Basis) KTX2 binaries — the first
 * asset-pipeline payload for SCENERY_SYSTEM_PLAN.md §8/§4.2.
 *
 * §8 specifies "KTX2/UASTC" textures. There is no UASTC/Basis encoder in
 * this repo, and §17 forbids adding a dependency to get one, so this script
 * packs plain RGBA8 pixel data into a valid, non-supercompressed KTX2
 * container instead (`supercompressionScheme: NONE`, `vkFormat:
 * R8G8B8A8_UNORM`). `KTX2Loader._createTexture` branches on
 * `vkFormat !== VK_FORMAT_UNDEFINED` and, for a raw format like this one,
 * calls `createRawTexture()` directly — no Basis transcoder involved, so
 * this loads through the exact same loader §8 already requires. The
 * documented cost: uncompressed RGBA8 is ~8x larger per pixel than real
 * UASTC, so resolution here is 240x240, not the plan's literal 1024x1024,
 * to stay inside the ≤250KB-per-texture budget. Swap this script for a real
 * UASTC encoder later and the resolution can go back up — nothing downstream
 * depends on 240 specifically.
 */

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const outDir = path.join(root, "public/textures");

const SIZE = 240;
const BUDGET_BYTES = 250 * 1024;

/** mulberry32 — duplicated from src/lib/experience/random.ts's `seededRandom`:
 * that file is TypeScript inside the app bundle, this script runs standalone
 * under plain Node, so the two copies can't share an import. */
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

/**
 * A brushed-aluminium height field: fine grooves running along X (the brush
 * direction), each row offset by low-frequency waviness plus per-pixel
 * grain — the same streak-plus-grain shape real brushed metal reads as.
 */
function brushHeight(x, y, rand) {
  const rowWave = Math.sin(y * 0.15) * 0.5 + Math.sin(y * 0.041 + 1.7) * 0.3;
  const streak = Math.sin(x * 1.3 + y * 0.07) * 0.15;
  // Small on purpose: this term also drives the normal map's per-pixel tilt
  // (see generateNormal), and brushed metal reads as fine sheen, not bumps.
  const grain = (rand() - 0.5) * 0.06;
  return rowWave + streak + grain;
}

function generateOrm(size, seed) {
  const rand = seededRandom(seed);
  const data = new Uint8Array(size * size * 4);

  // §4.2: metalness 0.9, roughness 0.15, mostly-unoccluded AO.
  const baseAo = 250;
  const baseRoughness = 0.15 * 255;
  const baseMetalness = 0.9 * 255;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const h = brushHeight(x, y, rand);
      const i = (y * size + x) * 4;

      // Panel seams every 60px catch a touch less light and roughen slightly.
      const seam = x % 60 < 2 || y % 60 < 2 ? 1 : 0;

      data[i + 0] = clamp255(baseAo - seam * 18 - Math.abs(h) * 6);
      data[i + 1] = clamp255(baseRoughness + h * 22 + seam * 20);
      data[i + 2] = clamp255(baseMetalness - seam * 30);
      data[i + 3] = 255;
    }
  }

  return data;
}

function generateNormal(size, seed) {
  const rand = seededRandom(seed);
  // Precompute the same height field ORM's grooves came from, so the normal
  // map's tilt matches the surface AO/roughness are describing.
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      heights[y * size + x] = brushHeight(x, y, rand);
    }
  }
  const at = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];

  const strength = 1.0;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // Tangent-space normal: (-dx, -dy, 1), normalized, packed to [0, 255].
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

/** Packs raw RGBA8 pixels into a valid, single-level, uncompressed KTX2 container. */
function packKtx2(pixels, size) {
  const container = createDefaultContainer();
  container.vkFormat = VK_FORMAT_R8G8B8A8_UNORM;
  container.typeSize = 1;
  container.pixelWidth = size;
  container.pixelHeight = size;
  container.pixelDepth = 0;
  container.layerCount = 0;
  container.faceCount = 1;
  container.levelCount = 1; // explicit single level — no runtime mip generation.
  container.supercompressionScheme = KHR_SUPERCOMPRESSION_NONE;
  container.levels = [{ levelData: pixels, uncompressedByteLength: pixels.byteLength }];

  const dfd = container.dataFormatDescriptor[0];
  dfd.colorModel = KHR_DF_MODEL_RGBSDA;
  // Data map, not colour — S5's "NoColorSpace for normal/ORM data": three's
  // KTX2Loader.parseColorSpace() maps UNSPECIFIED primaries straight to
  // THREE.NoColorSpace regardless of transferFunction.
  dfd.colorPrimaries = KHR_DF_PRIMARIES_UNSPECIFIED;
  dfd.transferFunction = KHR_DF_TRANSFER_LINEAR;
  dfd.bytesPlane = [4, 0, 0, 0, 0, 0, 0, 0];

  return writeKtx2(container);
}

function writeAndVerify(name, bytes) {
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
  console.log(`[generate-observatory-textures] ${name}: ${kb} KB${overBudget}`);
}

const ormPixels = generateOrm(SIZE, 0x0b5e_2201);
const normalPixels = generateNormal(SIZE, 0x0b5e_2202);

writeAndVerify("brushed-orm.ktx2", packKtx2(ormPixels, SIZE));
writeAndVerify("brushed-normal.ktx2", packKtx2(normalPixels, SIZE));
