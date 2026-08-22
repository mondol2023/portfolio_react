import { Gamepad2 } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Floating link to the game page. Mirrors `SurpriseButton`'s placement but on
 * the opposite corner, so the two never collide.
 */

interface PlayButtonProps {
  className?: string;
}

export function PlayButton({ className }: PlayButtonProps) {
  return (
    <Link
      href="/play"
      className={cn(
        // `bottom-18` clears the taskbar at every breakpoint — the bar is fixed
        // and 56px tall, so a 16px offset would tuck this underneath it.
        "fixed bottom-18 left-4 z-40 sm:left-6",
        buttonClasses("primary", "md", "shadow-lg motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0"),
        className,
      )}
    >
      <Gamepad2 aria-hidden="true" className="size-4" />
      Play
    </Link>
  );
}
