export function useProgram(gl: WebGLRenderingContext, program: WebGLProgram): void {
  if (gl.getParameter(gl.CURRENT_PROGRAM) !== program) {
    console.log('switching webgl program');
    gl.useProgram(program);
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
    throw 'Failed to create vertex shader';
  }
  gl.shaderSource(vs, vertexShaderSource);
  gl.compileShader(vs);

  // Catch some possible errors on vertex shader

  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vs));
    throw 'Errors compiling vertex shader';
  }

  // Compile fragment shader

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fs) {
    throw 'Errors compiling fragment shader';
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
    throw 'Failed to create program';
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Catch some possible errors on program

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw 'Errors linking program';
  }

  return program;
}
