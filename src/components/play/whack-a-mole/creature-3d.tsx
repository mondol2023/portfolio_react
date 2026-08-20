"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { buildCreature, disposeCreature } from "@/lib/whack-a-mole/creatures";
import type { CreatureKind } from "@/lib/whack-a-mole/types";

interface Creature3DProps {
  kind: CreatureKind;
  className?: string;
  /** Freezes idle rotation mid-pose without tearing the scene down — used while the board is paused for a hit elsewhere. */
  frozen?: boolean;
  /** Idle-rotation speed multiplier; climbs as the game's difficulty ramps up. */
  speed?: number;
}

/**
 * A tiny self-contained Three.js viewport — its own scene, camera and
 * renderer, sized to whatever box it's dropped into. Each hole mounts one of
 * these instead of a flat emoji glyph, so the character reads as an actual
 * 3D toy sitting in the hole rather than printed text.
 *
 * One `WebGLRenderer` per mounted creature is deliberate here: holes come and
 * go (a creature only exists while `mole.character` is set), so the number
 * of live contexts tracks how many characters are actually on screen at
 * once — comfortably under the browser's context limit for a grid this size.
 */
export function Creature3D({ kind, className, frozen = false, speed = 1 }: Creature3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMotionPreference();
  // Mirrored into refs (not effect deps) so toggling frozen/speed just changes
  // what the next animation frame does, instead of tearing down and rebuilding
  // the whole scene — freezing on every hit would otherwise reset every other
  // creature's WebGL context on the board.
  const frozenRef = useRef(frozen);
  const speedRef = useRef(speed);
  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
    camera.position.set(0, 0.85, 3.2);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(2, 3, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd9ff, 0.35);
    rim.position.set(-2, 1.5, -2);
    scene.add(rim);

    const creature = buildCreature(kind);
    scene.add(creature);

    const resize = () => {
      const size = Math.max(container.clientWidth, container.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size, size);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let frameId: number | null = null;
    const spin = (time: number) => {
      // Gentle idle rotation so the model reads as 3D at a glance, not a still
      // render — skipped while frozen, which leaves the last rendered pose on
      // screen (the canvas isn't cleared) instead of visibly stopping mid-swing.
      if (!frozenRef.current) {
        creature.rotation.y = Math.sin(time * 0.0012 * speedRef.current) * 0.55;
        renderer.render(scene, camera);
      }
      frameId = requestAnimationFrame(spin);
    };

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      frameId = requestAnimationFrame(spin);
    }

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      disposeCreature(creature);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind, reduceMotion]);

  return <div ref={containerRef} aria-hidden="true" className={className ?? "size-full"} />;
}
