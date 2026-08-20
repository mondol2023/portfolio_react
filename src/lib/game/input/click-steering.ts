import * as THREE from "three";

/**
 * Turns a mouse click on the canvas into a point on the play plane (y = 0).
 *
 * Single responsibility: DOM click → world-space point. What the point is
 * *used for* (steering the snake) is the caller's concern, passed in as a
 * callback — this class doesn't know a snake exists.
 */
export class ClickSteering {
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly pointer = new THREE.Vector2();

  private readonly handleClick = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const worldPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, worldPoint)) {
      this.onWorldClick(worldPoint);
    }
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly onWorldClick: (point: THREE.Vector3) => void,
  ) {
    this.canvas.addEventListener("click", this.handleClick);
  }

  dispose(): void {
    this.canvas.removeEventListener("click", this.handleClick);
  }
}
