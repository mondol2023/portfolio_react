import type { Metadata } from "next";
import Link from "next/link";

import { ArcadeExit, ArcadeScope } from "@/components/play/arcade-chrome";

/**
 * Cabinet select. `PlayButton` on the main site links here; each cartridge
 * below links to a fullscreen game route.
 *
 * Written as the same cabinet as the Project Arcade rather than as a separate
 * app: numbered slots, mono channel labels, the arcade's own rose tone. The
 * emoji stays — it is the one thing on the screen doing the job a cartridge
 * label art does, and replacing it with an icon would make both cards look
 * like buttons.
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
    <ArcadeScope className="surface-grid fixed inset-0 flex flex-col bg-bg text-fg">
      <ArcadeExit href="/" label="Return to portfolio" className="absolute top-4 left-4" />

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
        <div>
          <p className="font-mono text-[11px] tracking-[0.24em] text-tone uppercase">
            Game mode — cabinet select
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Insert a cartridge</h1>
          <p className="mt-3 text-sm text-fg-muted">
            Two in the machine. Both playable with just a mouse.
          </p>
        </div>

        <ul className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          {GAMES.map((game, index) => (
            <li key={game.href}>
              <Link
                href={game.href}
                className="group flex h-full flex-col items-center gap-3 rounded-card border border-border bg-surface/70 p-8 text-center backdrop-blur-sm transition-colors hover:border-tone hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
              >
                <span className="font-mono text-[11px] tracking-[0.24em] text-fg-subtle uppercase">
                  Slot {String(index + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="text-5xl">
                  {game.emoji}
                </span>
                <span className="text-xl font-semibold tracking-tight">{game.title}</span>
                <span className="text-sm text-fg-muted">{game.description}</span>
                <span className="mt-auto pt-4 font-mono text-[11px] tracking-[0.18em] text-fg-subtle uppercase transition-colors group-hover:text-tone">
                  [ Insert coin ]
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ArcadeScope>
  );
}
