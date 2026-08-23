"use client";

import { AnimatePresence } from "motion/react";
import { useState } from "react";

import { Stagger, StaggerItem } from "@/components/motion/stagger";
import type { Project } from "@/lib/types/content";
import type { TechIconMap } from "@/lib/utils/tech-icons";

import { ArcadeCanvas } from "./arcade-canvas";
import { Cartridge } from "./cartridge";
import { ExpandedCartridge } from "./expanded-cartridge";

/**
 * The arcade grid: a shared background scene behind a grid of cartridges,
 * plus the overlay one of them grows into. Hover state from any cartridge
 * feeds the background's spark burst; selecting one removes its grid slot
 * and grows `ExpandedCartridge` from the same spot via a shared `layoutId`.
 */

interface ArcadeProps {
  projects: Project[];
  techIcons: TechIconMap;
}

export function Arcade({ projects, techIcons }: ArcadeProps) {
  // A count rather than a flag: hover can start on one cartridge and end on
  // another before the first pointerleave fires, which would otherwise drop
  // the background effect for a frame between the two.
  const [hoverCount, setHoverCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Survives the close, so the cartridge coming back into the grid knows it is
  // the one that should take focus off the dismissed overlay.
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const selected = projects.find((project) => project.id === selectedId) ?? null;

  function select(id: string) {
    setSelectedId(id);
    setLastSelectedId(id);
    setHoverCount(0);
  }

  function handleHover(hovered: boolean) {
    setHoverCount((count) => Math.max(0, count + (hovered ? 1 : -1)));
  }

  function close() {
    setSelectedId(null);
    // A cartridge that was hovered when it was selected never received its
    // `pointerleave` — it unmounted first — so the count would stay stuck
    // above zero and leave the spark burst lit for good.
    setHoverCount(0);
  }

  return (
    <div className="relative mt-16">
      <ArcadeCanvas hovered={hoverCount > 0} />

      <Stagger as="ul" step={0.06} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects
          .filter((project) => project.id !== selectedId)
          .map((project) => (
            <StaggerItem as="li" key={project.id}>
              <Cartridge
                project={project}
                techIcons={techIcons}
                dimmed={selectedId !== null}
                restoreFocus={selectedId === null && project.id === lastSelectedId}
                onHover={handleHover}
                onSelect={() => select(project.id)}
              />
            </StaggerItem>
          ))}
      </Stagger>

      <AnimatePresence>
        {selected ? (
          <ExpandedCartridge project={selected} techIcons={techIcons} onClose={close} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
