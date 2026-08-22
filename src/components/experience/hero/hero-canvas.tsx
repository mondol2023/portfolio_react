"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Mount point for the hero's 3D environment.
 *
 * This wrapper exists for one structural reason: `next/dynamic` with
 * `ssr: false` is only legal inside a Client Component, and the hero section
 * itself is a server component that ships no JavaScript. So the split lives
 * here — the section renders one small client island, and Three.js, drei and
 * the scene arrive in a separate chunk after the page is interactive.
 *
 * It also owns the question "should the scene be running at all", because that
 * answer depends on the DOM (is the hero on screen, is the tab visible) and the
 * scene should not have to reach outside its own canvas to find out.
 */

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  // Deliberately empty. The section has its own gradient and grid behind this
  // layer, so an absent canvas looks like a quiet hero rather than a hole; a
  // spinner here would announce a decoration that nobody asked to wait for.
  loading: () => null,
});

export function HeroCanvas() {
  const reducedMotion = useMotionPreference();
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [tabActive, setTabActive] = useState(true);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    // A third IntersectionObserver in this app, and the justification the
    // codebase asks for: the two existing ones watch section *entry* to drive
    // navigation state, at thresholds tuned for that. This one asks a different
    // question — is any pixel of the canvas on screen — and answering it wrong
    // means a WebGL loop burning a laptop battery six sections away.
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      { rootMargin: "120px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onVisibility() {
      setTabActive(document.visibilityState === "visible");
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      // Behind the copy, ignoring the pointer, and masked at the bottom so the
      // scene fades into the page instead of ending on a visible seam.
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
    >
      <HeroScene active={visible && tabActive} still={reducedMotion} />
    </div>
  );
}
