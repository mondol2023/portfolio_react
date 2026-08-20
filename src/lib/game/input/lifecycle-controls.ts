const PLAY_BUTTON_ID = "play-btn";
const RESTART_BUTTON_ID = "restart-btn";
const PAUSE_BUTTON_ID = "pause-btn";
const RESUME_BUTTON_ID = "resume-btn";

interface LifecycleCallbacks {
  onPlay: () => void;
  onRestart: () => void;
  onPause: () => void;
  onResume: () => void;
}

/**
 * Wires the game's start/restart/pause/resume controls to whatever DOM
 * buttons carry the `#play-btn` / `#restart-btn` / `#pause-btn` / `#resume-btn` ids.
 *
 * Uses one delegated listener on `document` rather than querying the buttons
 * directly: the overlay is React-rendered and mounts/unmounts these buttons
 * as the game state changes, so a direct reference taken at construction
 * time would go stale the moment the screen changes. Delegation needs no
 * re-querying and stays correct across every re-render.
 */
export class LifecycleControls {
  private readonly handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest(`#${PLAY_BUTTON_ID}`)) this.callbacks.onPlay();
    else if (target.closest(`#${RESTART_BUTTON_ID}`)) this.callbacks.onRestart();
    else if (target.closest(`#${PAUSE_BUTTON_ID}`)) this.callbacks.onPause();
    else if (target.closest(`#${RESUME_BUTTON_ID}`)) this.callbacks.onResume();
  };

  constructor(private readonly callbacks: LifecycleCallbacks) {
    document.addEventListener("click", this.handleClick);
  }

  dispose(): void {
    document.removeEventListener("click", this.handleClick);
  }
}
