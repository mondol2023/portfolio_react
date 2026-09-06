import { create } from "zustand";

import { AUDIO_RULES } from "../config/game-config";

/**
 * Sound preference for the world. The synthesis itself lives in
 * `audio/audio-controller.ts` (WebAudio, no asset files); this store only
 * holds whether the visitor wants to hear it.
 *
 * Defaults to on: the world's sounds are quiet, synthesised and only start
 * after the visitor's first click (a browser autoplay-policy requirement the
 * controller honours by resuming the context inside a real gesture).
 */
interface AudioStoreState {
  enabled: boolean;
  volume: number;
  toggle(): boolean;
  setVolume(volume: number): void;
}

export const useAudioStore = create<AudioStoreState>()((set) => ({
  enabled: true,
  volume: AUDIO_RULES.masterVolume,

  toggle() {
    let enabled = false;
    set((state) => {
      enabled = !state.enabled;
      return { enabled };
    });
    return enabled;
  },

  setVolume(volume) {
    set({ volume: Math.min(1, Math.max(0, volume)) });
  },
}));
