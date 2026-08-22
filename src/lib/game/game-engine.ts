import * as THREE from "three";

import { GAME_CONFIG } from "./config";
import { Food } from "./entities/food";
import { Snake } from "./entities/snake";
import { ClickSteering } from "./input/click-steering";
import { LifecycleControls } from "./input/lifecycle-controls";
import { SceneManager } from "./scene/scene-manager";
import { checkFoodCollision, checkSelfCollision } from "./systems/collision-system";
import { GameState, type GameEvents } from "./types";
import { EventBus } from "./utils/event-bus";

/** Longest delta-time a single frame is allowed to advance the simulation, so a stalled tab can't teleport the snake. */
const MAX_FRAME_SECONDS = 0.1;

/**
 * Orchestrator: the only module that knows the full cast (scene, snake,
 * food, input, collisions, state) and wires them together. Everything else
 * in `lib/game` can be understood, and swapped, on its own.
 *
 * Owns exactly one render loop, which only runs while `PLAYING` — the idle
 * and game-over screens are a single frozen frame, not a spinning idle loop.
 */
export class GameEngine {
  private readonly sceneManager: SceneManager;
  private readonly lifecycleControls: LifecycleControls;
  private readonly events = new EventBus<GameEvents>();
  private readonly timer = new THREE.Timer();

  private state: GameState = GameState.IDLE;
  private score = 0;
  private frameId: number | null = null;

  private snake: Snake | null = null;
  private food: Food | null = null;
  private clickSteering: ClickSteering | null = null;

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.lifecycleControls = new LifecycleControls({
      onPlay: () => this.start(),
      onRestart: () => this.start(),
      onPause: () => this.pause(),
      onResume: () => this.resume(),
    });
    this.timer.connect(document); // Page Visibility API: a hidden tab reports a zero delta

    this.sceneManager.render(); // one static frame for the idle screen
  }

  /** Subscribes to an engine event; call the returned function to unsubscribe. */
  on<K extends keyof GameEvents>(event: K, handler: (payload: GameEvents[K]) => void): () => void {
    return this.events.subscribe(event, handler);
  }

  /** (Re)starts a run. Safe to call from IDLE or GAME_OVER — tears down any previous run first. */
  private start(): void {
    this.teardownRun();

    this.snake = new Snake(this.sceneManager.scene);
    this.food = new Food(this.sceneManager.scene);
    this.food.spawn(this.snake.getAllPositions());
    this.clickSteering = new ClickSteering(
      this.sceneManager.domElement,
      this.sceneManager.camera,
      (point) => this.steerSnakeTowards(point),
    );

    this.score = 0;
    this.events.emit("score", this.score);
    this.setState(GameState.PLAYING);

    this.timer.reset(); // discard idle time so the first tick's delta is small
    this.frameId = requestAnimationFrame(this.tick);
  }

  private steerSnakeTowards(worldPoint: THREE.Vector3): void {
    if (!this.snake) return;
    const head = this.snake.getHeadPosition();
    const angle = Math.atan2(worldPoint.z - head.z, worldPoint.x - head.x);
    this.snake.steerTowards(angle);
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.snake || !this.food) return;

    // One update per frame, so every getDelta() below this line agrees.
    this.timer.update(timestamp);
    const deltaSeconds = Math.min(this.timer.getDelta(), MAX_FRAME_SECONDS);
    this.snake.update(deltaSeconds);

    const head = this.snake.getHeadPosition();

    if (checkSelfCollision(head, this.snake.getCollidableBodyPositions())) {
      this.endRun();
      return;
    }

    if (checkFoodCollision(head, this.food.getPosition())) {
      this.snake.grow(GAME_CONFIG.growthPerFood);
      this.score += 1;
      this.events.emit("score", this.score);
      this.food.spawn(this.snake.getAllPositions());
    }

    this.sceneManager.render();
    this.frameId = requestAnimationFrame(this.tick);
  };

  /** Freezes the run in place. Only valid mid-game — a no-op from any other state. */
  private pause(): void {
    if (this.state !== GameState.PLAYING) return;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.setState(GameState.PAUSED);
  }

  /** Continues a paused run. Only valid while paused — a no-op from any other state. */
  private resume(): void {
    if (this.state !== GameState.PAUSED) return;
    this.timer.reset(); // discard time spent paused so the next tick's delta stays small
    this.setState(GameState.PLAYING);
    this.frameId = requestAnimationFrame(this.tick);
  }

  private endRun(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.sceneManager.render(); // freeze on the collision frame
    this.setState(GameState.GAME_OVER);
  }

  private setState(next: GameState): void {
    this.state = next;
    this.events.emit("statechange", next);
  }

  /** Disposes the current run's entities and input listener. Leaves scene/state alone. */
  private teardownRun(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;

    this.clickSteering?.dispose();
    this.snake?.dispose();
    this.food?.dispose();
    this.clickSteering = null;
    this.snake = null;
    this.food = null;
  }

  /** Full teardown — call once, when the React component unmounts. */
  destroy(): void {
    this.teardownRun();
    this.timer.dispose();
    this.lifecycleControls.dispose();
    this.sceneManager.dispose();
    this.events.clear();
  }
}
