import * as THREE from "three";

import type { CreatureKind } from "./types";

/**
 * Procedural low-poly critters for the whack-a-mole holes.
 *
 * Built from primitives rather than loaded models — no assets to license or
 * fetch, and they stay crisp at the tiny size a hole renders them at. Each
 * builder returns a self-contained `Group` centred near the origin and
 * facing +Z, ready to drop into any scene (see `Creature3D`).
 */

interface Palette {
  body: number;
  accent: number;
  dark: number;
}

const PALETTES: Record<CreatureKind, Palette> = {
  goat: { body: 0xe8e3d8, accent: 0xcfc7b3, dark: 0x2b2620 },
  sheep: { body: 0xf6f1e4, accent: 0xdccdae, dark: 0x2b2620 },
  cat: { body: 0x202024, accent: 0x3d3d44, dark: 0x0b0b0d },
  fox: { body: 0xd9691f, accent: 0xf5ecdc, dark: 0x2b1608 },
};

function material(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });
}

function addLegs(group: THREE.Group, palette: Palette): void {
  const legGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.34, 8);
  const legMaterial = material(palette.dark);

  for (const x of [-0.32, 0.32]) {
    for (const z of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(x, -0.32, z);
      group.add(leg);
    }
  }
}

function addEars(group: THREE.Group, kind: CreatureKind, palette: Palette): void {
  switch (kind) {
    case "goat": {
      // Two backswept horns, plus small flat ears.
      const hornGeometry = new THREE.ConeGeometry(0.06, 0.42, 8);
      const hornMaterial = material(palette.dark);
      for (const x of [-0.16, 0.16]) {
        const horn = new THREE.Mesh(hornGeometry, hornMaterial);
        horn.position.set(x, 0.78, 0.5);
        horn.rotation.x = -0.7;
        group.add(horn);
      }
      const earGeometry = new THREE.SphereGeometry(0.12, 8, 6);
      for (const x of [-0.38, 0.38]) {
        const ear = new THREE.Mesh(earGeometry, material(palette.body));
        ear.scale.set(1, 0.5, 0.6);
        ear.position.set(x, 0.5, 0.58);
        group.add(ear);
      }
      break;
    }
    case "sheep": {
      // Rounder, floppier ears; no horns.
      const earGeometry = new THREE.SphereGeometry(0.14, 8, 6);
      for (const x of [-0.4, 0.4]) {
        const ear = new THREE.Mesh(earGeometry, material(palette.accent));
        ear.scale.set(0.9, 0.5, 0.7);
        ear.position.set(x, 0.42, 0.6);
        ear.rotation.z = x > 0 ? -0.4 : 0.4;
        group.add(ear);
      }
      break;
    }
    case "cat": {
      const earGeometry = new THREE.ConeGeometry(0.15, 0.28, 4);
      for (const x of [-0.22, 0.22]) {
        const ear = new THREE.Mesh(earGeometry, material(palette.body));
        ear.rotation.y = Math.PI / 4;
        ear.position.set(x, 0.78, 0.58);
        group.add(ear);
      }
      break;
    }
    case "fox": {
      const earGeometry = new THREE.ConeGeometry(0.17, 0.36, 4);
      const innerGeometry = new THREE.ConeGeometry(0.09, 0.2, 4);
      for (const x of [-0.24, 0.24]) {
        const ear = new THREE.Mesh(earGeometry, material(palette.body));
        ear.rotation.y = Math.PI / 4;
        ear.position.set(x, 0.82, 0.56);
        group.add(ear);

        const inner = new THREE.Mesh(innerGeometry, material(palette.dark));
        inner.rotation.y = Math.PI / 4;
        inner.position.set(x * 0.85, 0.78, 0.62);
        group.add(inner);
      }
      break;
    }
  }
}

function addTail(group: THREE.Group, kind: CreatureKind, palette: Palette): void {
  switch (kind) {
    case "cat": {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 8), material(palette.body));
      tail.position.set(0, 0.15, -0.6);
      tail.rotation.x = -0.9;
      group.add(tail);
      break;
    }
    case "fox": {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), material(palette.body));
      tail.scale.set(0.8, 0.8, 1.6);
      tail.position.set(0, 0.05, -0.75);
      group.add(tail);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), material(palette.accent));
      tip.position.set(0, 0.05, -1.05);
      group.add(tip);
      break;
    }
    case "goat":
    case "sheep": {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), material(palette.accent));
      tail.position.set(0, 0.1, -0.62);
      group.add(tail);
      break;
    }
  }
}

/** Builds one character as a self-contained group, ready to add to any scene. */
export function buildCreature(kind: CreatureKind): THREE.Group {
  const group = new THREE.Group();
  const palette = PALETTES[kind];

  const bodyGeometry =
    kind === "sheep"
      ? new THREE.IcosahedronGeometry(0.6, 1) // faceted — reads as wool at a glance
      : new THREE.SphereGeometry(0.6, 16, 12);
  const body = new THREE.Mesh(bodyGeometry, material(palette.body));
  body.scale.set(1, 0.85, 1.15);
  body.position.y = 0.05;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), material(palette.body));
  head.position.set(0, 0.48, 0.6);
  group.add(head);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), material(palette.accent));
  muzzle.scale.set(1, 0.8, 1.15);
  muzzle.position.set(0, 0.36, 0.92);
  group.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), material(palette.dark));
  nose.position.set(0, 0.4, 1.1);
  group.add(nose);

  addEars(group, kind, palette);
  addTail(group, kind, palette);
  addLegs(group, palette);

  return group;
}

/** Frees every geometry and material owned by a group built with `buildCreature`. */
export function disposeCreature(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const mat = child.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
  });
}
