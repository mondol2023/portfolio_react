import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies the Draco/Basis/Meshopt decoder binaries three ships under
 * `examples/jsm/libs/` into `public/decoders/`, where `loaders.ts` points
 * `DRACOLoader`/`KTX2Loader` at runtime (SCENERY_SYSTEM_PLAN.md §8).
 *
 * Runs on `postinstall` so the binaries always match the installed `three`
 * version. `public/decoders/` is gitignored — decoders are never
 * hand-committed, this script is the only source of truth for their content.
 */

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const libs = path.join(root, "node_modules/three/examples/jsm/libs");
const out = path.join(root, "public/decoders");

if (!fs.existsSync(libs)) {
  console.warn(`[copy-decoders] ${libs} not found — is "three" installed? Skipping.`);
  process.exit(0);
}

const copies = [
  { from: path.join(libs, "draco/gltf"), to: path.join(out, "draco") },
  { from: path.join(libs, "basis"), to: path.join(out, "basis") },
];

for (const { from, to } of copies) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

fs.mkdirSync(path.join(out, "meshopt"), { recursive: true });
fs.copyFileSync(
  path.join(libs, "meshopt_decoder.module.js"),
  path.join(out, "meshopt/meshopt_decoder.module.js"),
);

console.log(`[copy-decoders] Wrote draco/, basis/, meshopt/ to ${path.relative(root, out)}`);
