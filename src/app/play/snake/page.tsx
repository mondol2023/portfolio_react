import type { Metadata } from "next";

import { Game } from "@/components/play/game";

/**
 * Full-viewport 3D snake game.
 *
 * Lives outside the `(site)` route group deliberately: this page is a
 * fullscreen canvas, not a section of the normal site shell, so it renders
 * with none of the header/footer/surprise-button chrome those routes share.
 */

export const metadata: Metadata = {
  title: "Snake",
  description: "A 3D snake game built with three.js.",
};

export default function SnakePage() {
  return <Game />;
}
