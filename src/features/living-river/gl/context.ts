/**
 * Getting a drawing context, and being honest when we cannot.
 *
 * Everything downstream of this file assumes WebGL works. That assumption is
 * wrong often enough to matter — a blocklisted driver, a locked-down browser,
 * a machine that has simply run out of contexts because the reader has twenty
 * tabs open — so the failure is a `null` the caller has to handle rather than
 * an exception thrown into an animation frame.
 */

export interface GLContext {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  /** True when we got WebGL2. The shaders target ES 1.00 either way; this is for logging. */
  isWebGL2: boolean;
}

/**
 * `alpha: true` because this is a backdrop — the page's own background colour
 * shows through wherever the scene fades out, which is what keeps body text
 * readable over it.
 *
 * `depth`/`stencil` off because there is no geometry: the whole scene is one
 * triangle whose fragment shader does the intersection maths itself, so there
 * is nothing to depth-sort and the buffers would be dead memory bandwidth.
 *
 * `powerPreference: "low-power"` because a decorative backdrop has no business
 * waking a laptop's discrete GPU and costing the reader battery.
 */
const ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: "low-power",
  failIfMajorPerformanceCaveat: false,
};

export function createGLContext(canvas: HTMLCanvasElement): GLContext | null {
  try {
    const gl2 = canvas.getContext("webgl2", ATTRIBUTES);
    if (gl2) return { gl: gl2, isWebGL2: true };

    const gl1 = canvas.getContext("webgl", ATTRIBUTES);
    if (gl1) return { gl: gl1, isWebGL2: false };
  } catch {
    // Some browsers throw rather than return null when WebGL is disabled.
  }

  return null;
}
