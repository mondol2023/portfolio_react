"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Should a WebGL scene be running right now?
 *
 * Two questions, one answer: is any part of the canvas on screen, and is the
 * tab in front. Both have to be false for a render loop to be free, and both
 * are DOM facts a scene cannot see from inside its own `useFrame` — so they are
 * answered out here and handed in as a prop.
 *
 * This is the difference between a decorative canvas and a laptop fan: without
 * it, every scene on the page keeps drawing while the visitor reads a section
 * six panes away, or while they are in another tab entirely.
 *
 * Returns the ref to attach to the element that wraps the canvas, and whether
 * the loop should run. Starts `true` so the first paint is never a blank frame
 * waiting on an observer callback.
 */
export function useSceneActive<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  const [tabActive, setTabActive] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // A margin, so the scene is already running by the time it is scrolled to
    // rather than starting its first frame in view.
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

  return [ref, visible && tabActive];
}
