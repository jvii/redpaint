// Tracks the program bound on each context so activateProgram can skip
// redundant useProgram calls without querying the driver (gl.getParameter is
// a synchronous round-trip and far too slow for per-draw-call use).
const currentProgram = new WeakMap<WebGLRenderingContext, WebGLProgram>();

export function activateProgram(gl: WebGLRenderingContext, program: WebGLProgram): void {
  if (currentProgram.get(gl) !== program) {
    currentProgram.set(gl, program);
    gl.useProgram(program);
  }
}

// Same idea, for gl.bindFramebuffer: every indexer/renderer in the painting
// canvas pipeline binds either the shared color-index framebuffer or the
// default (null, screen) one, often the same one several calls in a row
// (e.g. every symmetry copy's effect stamp targets the color-index
// framebuffer back to back). Skipping the redundant rebind matters more
// than it sounds - browsers whose WebGL implementation has higher per-call
// overhead (Safari's, notably) make that cost show up directly in how fast
// a heavily-stamped stroke feels. A WeakMap's "no entry yet" read is
// `undefined`, already distinct from a real `null` binding, so no separate
// sentinel is needed to track the screen framebuffer correctly.
const currentFramebuffer = new WeakMap<WebGLRenderingContext, WebGLFramebuffer | null>();

export function bindFramebuffer(
  gl: WebGLRenderingContext,
  framebuffer: WebGLFramebuffer | null
): void {
  if (currentFramebuffer.get(gl) !== framebuffer) {
    currentFramebuffer.set(gl, framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string
): WebGLProgram {
  // Compile vertex shader

  const vs = gl.createShader(gl.VERTEX_SHADER);
  if (!vs) {
    throw new Error('Failed to create vertex shader');
  }
  gl.shaderSource(vs, vertexShaderSource);
  gl.compileShader(vs);

  // Catch some possible errors on vertex shader

  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vs));
    throw new Error('Errors compiling vertex shader');
  }

  // Compile fragment shader

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fs) {
    throw new Error('Errors compiling fragment shader');
  }
  gl.shaderSource(fs, fragmentShaderSource);
  gl.compileShader(fs);

  // Catch some possible errors on fragment shader

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fs));
  }

  // Compile the program

  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);
  currentProgram.set(gl, program);

  // Catch some possible errors on program

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error('Errors linking program');
  }

  return program;
}
