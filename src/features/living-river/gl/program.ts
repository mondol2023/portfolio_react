/**
 * Shader compilation, and the uniform-location cache.
 *
 * `getUniformLocation` is a synchronous round trip into the driver, and this
 * scene sets around twenty uniforms every frame. Looking them up by name each
 * time would cost more than the maths in the shader. They are resolved once,
 * lazily, and memoised — including the misses, so a uniform the compiler
 * optimised away is not re-queried sixty times a second forever.
 */

export interface Program {
  program: WebGLProgram;
  /** `null` when the uniform does not exist or was optimised out. */
  uniform(name: string): WebGLUniformLocation | null;
  dispose(): void;
}

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[living-river] shader failed to compile\n", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): Program | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  if (!vertex) return null;

  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!fragment) {
    gl.deleteShader(vertex);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  // The shaders are reference-counted by the program from here, so they can be
  // released immediately whether or not the link succeeded.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[living-river] program failed to link\n", gl.getProgramInfoLog(program));
    }
    gl.deleteProgram(program);
    return null;
  }

  const locations = new Map<string, WebGLUniformLocation | null>();

  return {
    program,
    uniform(name) {
      let location = locations.get(name);
      if (location === undefined) {
        location = gl.getUniformLocation(program, name);
        locations.set(name, location);
      }
      return location;
    },
    dispose() {
      locations.clear();
      gl.deleteProgram(program);
    },
  };
}
