import type { Metadata } from "next";

import { WhackAMoleGame } from "@/components/play/whack-a-mole/whack-a-mole-game";

/** Full-viewport whack-a-mole game. Outside `(site)` — fullscreen, no site chrome. */

export const metadata: Metadata = {
  title: "Whack-a-Mole",
  description: "Whack the animals, avoid the fox, reach 100.",
};

export default function WhackAMolePage() {
  return <WhackAMoleGame />;
}
