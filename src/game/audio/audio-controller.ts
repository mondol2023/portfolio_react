import { AUDIO_RULES } from "../config/game-config";
import { useAudioStore } from "../stores/audio-store";

import type { AudioCue } from "../types/game";

/**
 * WebAudio synthesis for the world's sound — no asset files, no network.
 *
 * Every cue is a handful of oscillator envelopes, so the whole soundscape
 * costs bytes instead of downloads and respects the module's portability.
 * The context is created lazily on the first cue that follows a real user
 * gesture (a browser autoplay-policy requirement); the one-time gesture
 * listener is installed alongside the interaction system's own listeners, so
 * the first click both grabs a shape and unlocks audio.
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;
let gestureInstalled = false;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = useAudioStore.getState().volume;
    master.connect(context.destination);
  }
  return context;
}

/** Called from a real user-gesture handler; arms audio from then on. */
export function primeAudio(): void {
  if (gestureInstalled) {
    unlocked = true;
    void context?.resume();
    return;
  }
  gestureInstalled = true;
  unlocked = true;
  // The context may not exist yet; creating it inside a gesture handler is
  // what satisfies autoplay policies, so try eagerly and also on later cues.
  void ensureContext()?.resume();
}

export function playCue(cue: AudioCue): void {
  const store = useAudioStore.getState();
  if (!store.enabled || !unlocked) return;

  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
    return;
  }

  const now = ctx.currentTime;
  for (const voice of VOICES[cue]) {
    voice(ctx, master, now);
  }
}

export function syncMasterVolume(): void {
  if (master) master.gain.value = useAudioStore.getState().volume;
}

export function disposeAudio(): void {
  void context?.close();
  context = null;
  master = null;
}

type Voice = (ctx: AudioContext, destination: GainNode, at: number) => void;

function tone(
  frequency: number,
  endFrequency: number,
  duration: number,
  peak: number,
  type: OscillatorType = "sine",
): Voice {
  return (ctx, destination, at) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak * AUDIO_RULES.masterVolume, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  };
}

const VOICES: Record<AudioCue, Voice[]> = {
  spawn: [tone(360, 520, 0.14, 0.1)],
  poke: [tone(190, 140, 0.07, 0.12, "triangle")],
  throw: [tone(300, 110, 0.2, 0.1, "sine")],
  merge: [tone(523, 523, 0.3, 0.12), tone(784, 784, 0.34, 0.09)],
  split: [tone(150, 90, 0.16, 0.14, "triangle"), tone(220, 120, 0.12, 0.08, "square")],
  collect: [tone(660, 660, 0.14, 0.1), tone(880, 880, 0.16, 0.09), tone(1320, 1320, 0.22, 0.07)],
  "toggle-on": [tone(520, 700, 0.1, 0.1)],
  "toggle-off": [tone(500, 320, 0.12, 0.1)],
};
