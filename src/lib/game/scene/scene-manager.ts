import * as THREE from "three";

import { GAME_COLORS, GAME_CONFIG } from "../config";

/**
 * Owns the renderer, scene, camera and static dressing (floor, boundary).
 *
 * The only Three.js object other modules reach into is `scene` — everything
 * else here (camera framing, resize handling, renderer setup) is this
 * module's job alone, so `GameEngine` never touches `THREE.WebGLRenderer`
 * directly.
 */
export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(GAME_COLORS.background);

    // Top-down: sits above the origin looking straight down -Y. `up` is set to
    // -Z (instead of the default +Y) so `lookAt` doesn't hit the gimbal
    // singularity that occurs when the view direction is parallel to `up`.
    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(0, 30, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.addLights();
    this.addFloor();
    this.addBoundary();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.handleResize();
  }

  /** The canvas element clicks/raycasts are read from. */
  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private addLights(): void {
    this.scene.add(new THREE.AmbientLight(GAME_COLORS.ambientLight, 0.7));

    const sun = new THREE.DirectionalLight(GAME_COLORS.directionalLight, 0.9);
    sun.position.set(15, 25, 10);
    this.scene.add(sun);
  }

  private addFloor(): void {
    const { arenaSize } = GAME_CONFIG;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(arenaSize, arenaSize),
      new THREE.MeshStandardMaterial({ color: GAME_COLORS.floor }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(arenaSize, arenaSize / 2, GAME_COLORS.grid, GAME_COLORS.grid);
    this.scene.add(grid);
  }

  /** Outlines the wrap boundary so the play field reads as a bounded loop, not open space. */
  private addBoundary(): void {
    const half = GAME_CONFIG.arenaSize / 2;
    const points = [
      new THREE.Vector3(-half, 0.02, -half),
      new THREE.Vector3(half, 0.02, -half),
      new THREE.Vector3(half, 0.02, half),
      new THREE.Vector3(-half, 0.02, half),
    ];
    const loop = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: GAME_COLORS.boundary }),
    );
    this.scene.add(loop);
  }

  /** Fits the whole square arena inside the viewport, whatever its aspect ratio. */
  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.renderer.setSize(width, height);

    const aspect = width / height;
    const half = (GAME_CONFIG.arenaSize / 2) * GAME_CONFIG.arenaPadding;
    const [halfW, halfH] = aspect >= 1 ? [half * aspect, half] : [half, half / aspect];

    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.near = 0.1;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
  }

  /** Releases the renderer, its canvas and the resize observer. Geometries in `scene` are disposed by their owners. */
  dispose(): void {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
