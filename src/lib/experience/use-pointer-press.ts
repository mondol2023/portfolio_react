"use client";

import { useEffect } from "react";

import { scenePointer, setSceneDragging, wasClick } from "./scene-pointer";

/** Elements whose press belongs to the page — this listener sees every one. */
const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable="true"]';

/**
 * Publishes the pointer press to `scenePointer` for the frame loop to read.
 * Listeners are `passive` and never `preventDefault`, so scrolling, focus and
 * clicks behave exactly as before. Touch is dropped at the source (§10).
 */
export function usePointerPress(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    function onDown(event: PointerEvent) {
      if (event.pointerType === "touch" || event.button !== 0) return;
      scenePointer.grabAllowed = !(event.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      scenePointer.pressed = true;
      scenePointer.pressStamp += 1;
      scenePointer.pressStartX = event.clientX;
      scenePointer.pressStartY = event.clientY;
      scenePointer.pressStartTime = performance.now();
    }

    function onUp(event: PointerEvent) {
      scenePointer.lastReleaseWasClick = wasClick(event.clientX, event.clientY, performance.now());
      scenePointer.lastReleaseGrabAllowed = scenePointer.grabAllowed;
      onRelease();
    }

    /** Shared by a genuine release and a cancel/blur — the latter two are never a click. */
    function onRelease() {
      scenePointer.pressed = false;
      scenePointer.grabAllowed = false;
      scenePointer.releaseStamp += 1;
      setSceneDragging(false);
    }

    function onCancel() {
      scenePointer.lastReleaseWasClick = false;
      onRelease();
    }

    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    // A press that ends outside the window never fires `pointerup` on it.
    window.addEventListener("blur", onCancel);

    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      onCancel();
    };
  }, [enabled]);
}
