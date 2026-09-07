import type { RGB } from "../core/day-cycle";
import { MAX_RIPPLES, RIPPLE_LIFE } from "../core/water";
import type { World } from "../core/world";
import { createGLContext } from "./context";
import { createProgram, type Program } from "./program";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export interface WaterRenderer {
  /** Match the backing store to the canvas at this device-pixel ratio and quality scale. */
  resize(cssWidth: number, cssHeight: number, dpr: number, scale: number): void;
  render(world: World): void;
  dispose(): void;
}

/** Ripples are uploaded as one flat vec4 array: xy = origin, z = age, w = strength. */
const rippleData = new Float32Array(MAX_RIPPLES * 4);

/**
 * sRGB → linear, the standard piecewise transfer function.
 *
 * The palette in `core/day-cycle.ts` is authored as hex, which is sRGB — the
 * space colours are *displayed* in, not the space light *adds* in. The shader
 * adds light: it sums a sun halo onto a sky gradient, mixes a reflection into a
 * body colour, tone-maps the total and gamma-encodes the result back to sRGB at
 * the very end. Feeding it sRGB numbers means encoding twice, which washes the
 * whole scene out to pale grey and flattens the difference between noon and
 * midnight to almost nothing.
 *
 * This is the one boundary where the two spaces meet, so the conversion lives
 * here rather than in the palette — the 2D sprite layer paints onto a canvas
 * that wants sRGB, and gets to keep using the same table unchanged.
 */
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/**
 * The 3D half of the scene.
 *
 * Every frame is one draw call: three vertices, and a fragment shader that
 * works out for itself whether each pixel is sky or river. There is no mesh to
 * tessellate and no level of detail to manage, which is why a full horizon of
 * moving water costs about as much as a gradient.
 *
 * Returns `null` when WebGL is unavailable, and the caller falls back to the
 * flat 2D sky rather than showing a blank rectangle.
 */
export function createWaterRenderer(canvas: HTMLCanvasElement): WaterRenderer | null {
  const context = createGLContext(canvas);
  if (!context) return null;

  const { gl } = context;

  const compiled = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  if (!compiled) return null;

  // Re-bound to a non-nullable const so the render closure below does not have
  // to re-check something that cannot be null by the time it runs.
  const program: Program = compiled;

  // The only buffer in the scene: three corner indices, uploaded once.
  const buffer = gl.createBuffer();
  if (!buffer) {
    program.dispose();
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 2]), gl.STATIC_DRAW);

  const corner = gl.getAttribLocation(program.program, "aCorner");
  gl.useProgram(program.program);
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 1, gl.FLOAT, false, 0, 0);

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  let disposed = false;

  /** Uploads a palette colour, converted out of sRGB on the way. */
  function linear(name: string, color: RGB) {
    gl.uniform3f(
      program.uniform(name),
      toLinear(color[0]),
      toLinear(color[1]),
      toLinear(color[2]),
    );
  }

  function resize(cssWidth: number, cssHeight: number, dpr: number, scale: number) {
    // Cap at 2x: beyond that the extra pixels are invisible on a backdrop and
    // the fill cost is quadratic. The quality guard in `core/clock.ts` moves
    // `scale` below 1 on machines that cannot keep up even at that.
    const ratio = Math.min(dpr, 2) * scale;
    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));

    if (canvas.width === width && canvas.height === height) return;

    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  function render(world: World) {
    if (disposed) return;

    const { sky, cam } = world;

    gl.useProgram(program.program);

    gl.uniform2f(program.uniform("uResolution"), canvas.width, canvas.height);
    gl.uniform1f(program.uniform("uTime"), world.time);

    gl.uniform3f(program.uniform("uCamPos"), cam.x, cam.y, cam.z);
    gl.uniform1f(program.uniform("uYaw"), cam.yaw);
    gl.uniform1f(program.uniform("uPitch"), cam.pitch);
    gl.uniform1f(program.uniform("uFov"), cam.fov);

    // Directions are geometry, not colour — uploaded as they are.
    gl.uniform3f(program.uniform("uSunDir"), sky.sunDir[0], sky.sunDir[1], sky.sunDir[2]);
    gl.uniform3f(program.uniform("uMoonDir"), sky.moonDir[0], sky.moonDir[1], sky.moonDir[2]);

    linear("uSunTint", sky.sunTint);
    linear("uZenith", sky.zenith);
    linear("uHorizon", sky.horizon);
    linear("uWaterDeep", sky.waterDeep);
    linear("uWaterShallow", sky.waterShallow);
    linear("uFog", sky.fog);
    linear("uCloudTint", sky.cloudTint);

    gl.uniform1f(program.uniform("uCloudDensity"), sky.cloudDensity);
    gl.uniform1f(program.uniform("uSunUp"), sky.sunUp);
    gl.uniform1f(program.uniform("uNight"), sky.night);
    gl.uniform1f(program.uniform("uWind"), world.wind);

    for (let i = 0; i < MAX_RIPPLES; i += 1) {
      const ripple = world.ripples[i];
      const offset = i * 4;

      // A spent or empty slot is uploaded with strength 0, which the shader's
      // loop skips outright — cheaper than repacking the array every frame.
      if (!ripple || ripple.strength <= 0 || ripple.age >= RIPPLE_LIFE) {
        rippleData[offset + 3] = 0;
        continue;
      }

      rippleData[offset] = ripple.x;
      rippleData[offset + 1] = ripple.z;
      rippleData[offset + 2] = ripple.age;
      rippleData[offset + 3] = ripple.strength;
    }

    gl.uniform4fv(program.uniform("uRipples[0]"), rippleData);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;

    gl.deleteBuffer(buffer);
    program.dispose();

    // Ask the driver to release the context rather than waiting for GC. A page
    // that mounts and unmounts this a few times would otherwise hit the
    // browser's hard limit on live WebGL contexts.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  return { resize, render, dispose };
}
