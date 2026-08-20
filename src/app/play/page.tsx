import { ArrowLeft, Gamepad2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Game selection hub. `PlayButton` on the main site links here; each card
 * below links to a fullscreen game route.
 */

export const metadata: Metadata = {
  title: "Play",
  description: "Pick a game.",
};

const GAMES = [
  {
    href: "/play/snake",
    title: "3D Snake",
    description: "Click to steer, eat the spheres, avoid your own tail.",
    emoji: "🐍",
  },
  {
    href: "/play/whack-a-mole",
    title: "Whack-a-Mole",
    description: "Whack the animals, dodge the fox, reach 100 to win.",
    emoji: "🔨",
  },
] as const;

export default function PlaySelectPage() {
  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur hover:bg-white/20"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to site
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <h1 className="flex items-center justify-center gap-2 text-3xl font-semibold">
            <Gamepad2 aria-hidden="true" className="size-8" />
            Pick a game
          </h1>
          <p className="mt-2 text-white/60">Two to choose from. Both playable with just a mouse.</p>
        </div>

        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          {GAMES.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-8 text-center transition-colors hover:border-white/25 hover:bg-white/10"
            >
              <span className="text-5xl">{game.emoji}</span>
              <span className="text-xl font-semibold">{game.title}</span>
              <span className="text-sm text-white/60">{game.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
