const index: number[][] = [];

let gl: WebGLRenderingContext | null = null;

export function init(width: number, height: number): void {
  for (let i = 0; i < height; i++) {
    index[i] = new Array(width).fill(0);
  }
  console.log('set');
  console.log(index);

  // init a webgl context and a webl program for drawImage color indexing

  const canvas = document.createElement('canvas');
  canvas.width = 50;
  canvas.height = 50;

  gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true,
    antialias: false,
  });

  if (!gl) {
    alert('no webl!');
    return;
  }

  /*   const vertexShader = `
    precision mediump float;

    void main () {
      gl_Position = vec4((9.0-(10.0/2.0))/(10.0/2.0), ((10.0/2.0)-0.0)/(10.0/2.0), 0.0, 1.0);
      gl_PointSize = 1.0;
    }
    `;

  const fragmentShader = `
    precision mediump float;

    void main () {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    `; */

  const vertexShaderTexture = `
    precision mediump float;

    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;

    varying vec2 v_TexCoord;

    void main () {
      gl_Position = a_Position;
      gl_PointSize = 1.0;

      // Pass the texcoord to the fragment shader.
      v_TexCoord = a_TexCoord;
    }
    `;

  const fragmentShaderTexture = `
    precision mediump float;

    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;

    void main () {
      gl_FragColor = texture2D(u_Sampler, v_TexCoord);
    }
    `;

  const fragmentShaderFillRect = `
    precision mediump float;

    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;

    void main () {
      gl_FragColor = vec4(1.0/256.0, 0.0, 0.0, 1.0);
    }
    `;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  if (!vs) {
    return;
  }
  gl.shaderSource(vs, vertexShaderTexture);
  gl.compileShader(vs);
  // Catch some possible errors on vertex shader
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vs));
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fs) {
    return;
  }
  gl.shaderSource(fs, fragmentShaderFillRect);
  gl.compileShader(fs);

  // Catch some possible errors on fragment shader
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fs));
  }

  const program = gl.createProgram();
  if (!program) {
    return;
  }
  gl.attachShader(program, vs); // Attatch vertex shader
  gl.attachShader(program, fs); // Attatch fragment shader
  gl.linkProgram(program); // Link both shaders together
  gl.useProgram(program); // Use the created program

  // Catch some possible errors on program
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
  }
  console.log('compiled shaders');

  // create a texture to render to

  console.log('h: ' + gl?.drawingBufferHeight);
  console.log('w: ' + gl?.drawingBufferWidth);

  const targetTextureWidth = gl.drawingBufferHeight;
  const targetTextureHeight = gl.drawingBufferWidth;
  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);

  // define size and format of level 0

  const level = 0;
  const internalFormat = gl.RGBA;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  const data = null;
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    targetTextureWidth,
    targetTextureHeight,
    border,
    format,
    type,
    data
  );

  // set the filtering so we don't need mips

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // create and bind the framebuffer

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // attach the texture as the first color attachment

  const attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

  console.log('webgl initialized');

  // Load the brush texture
  loadTexture(gl);
  console.log('texture loaded');

  // tässä ei joku toimi

  /*   // Create a buffer object for texture coordinates
  const texCoordBuffer = gl.createBuffer();
  if (!texCoordBuffer) {
    console.log('Failed to create the buffer object ');
    return;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

  // eslint-disable-next-line @typescript-eslint/camelcase
  const a_TexCoord = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'a_TexCoord');

  // Assign the buffer object to a_TexCoord variable
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_TexCoord variable
  gl.enableVertexAttribArray(a_TexCoord); */

  const texcoordLocation = gl.getAttribLocation(program, 'a_TexCoord');
  console.log('texcoordLocation: ' + texcoordLocation);

  // Create a buffer for texcoords.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(texcoordLocation);

  // We'll supply texcoords as floats.
  gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]),
    gl.STATIC_DRAW
  );

  // Create a buffer object for vertex coordinates
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object ');
    return;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // eslint-disable-next-line @typescript-eslint/camelcase
  const a_Position = gl.getAttribLocation(program, 'a_Position');

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);
}

export function indexFillRect(x: number, y: number, width: number, heigth: number): void {
  if (!gl) {
    alert('no webl!');
    return;
  }
  console.log('fillRect');
  console.log('x: ' + x + ', x(gl): ' + canvasToWebGLCoordX(gl, x));
  console.log('y: ' + y + ', y(gl): ' + canvasToWebGLCoordY(gl, y));
  console.log('width: ' + width);
  console.log('heigth: ' + heigth);

  if (width === 1 && heigth === 1) {
    fillRectPoint(gl, x, y);
  } else {
    fillRectQuad(gl, x, y, width, heigth);
  }
}

function fillRectPoint(gl: WebGLRenderingContext, x: number, y: number): void {
  const vertices = new Float32Array(2);
  vertices[0] = canvasToWebGLCoordX(gl, x);
  vertices[1] = canvasToWebGLCoordY(gl, y);

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.POINTS, 0, 1);
}

function fillRectQuad(
  gl: WebGLRenderingContext,
  x: number,
  y: number,
  width: number,
  heigth: number
): void {
  const xLeft = canvasToWebGLCoordX(gl, x);
  const xRight = canvasToWebGLCoordX(gl, x + width);
  const yTop = canvasToWebGLCoordY(gl, y);
  const yBottom = canvasToWebGLCoordY(gl, y + heigth);

  const vertices = new Float32Array(8);
  vertices[0] = xLeft;
  vertices[1] = yTop;

  vertices[2] = xLeft;
  vertices[3] = yBottom;

  vertices[4] = xRight;
  vertices[5] = yTop;

  vertices[6] = xRight;
  vertices[7] = yBottom;

  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function getIndex(): void {
  if (!gl) {
    alert('no webl!');
    return;
  }

  console.log('h: ' + gl?.drawingBufferHeight);
  console.log('w: ' + gl?.drawingBufferWidth);

  const pixels = new Uint8Array(gl.drawingBufferHeight * gl.drawingBufferWidth * 4);
  gl.readPixels(
    0,
    0,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  const tempIndex = [];
  for (let i = 0; i < pixels.length; i = i + 4) {
    tempIndex.push(pixels[i]);
  }
  toBitmapString(tempIndex, gl.drawingBufferWidth);
}

function toBitmapString(indexArray: number[], width: number): void {
  let j = 0;
  let row = '';
  let rowNumber = 1;
  const rows = [];
  for (let i = 0; i < indexArray.length; i++) {
    j++;
    row = row + indexArray[i];
    if (j === width) {
      j = 0;
      //console.log(rowNumber + ': ' + row);
      rows.unshift(rowNumber + ': ' + row);
      row = '';
      rowNumber++;
    }
  }
  rows.forEach(item => console.log(item));
}

function loadTexture(gl: WebGLRenderingContext): WebGLTexture | null {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 2;
  const height = 2;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255]); // 2x2 brush
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // eslint-disable-next-line @typescript-eslint/camelcase
  const u_Sampler = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Sampler');
  gl.uniform1i(u_Sampler, 0); // texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler, 0);
  return texture;
}

function canvasToWebGLCoordX(gl: WebGLRenderingContext, x: number): number {
  return (x / gl.drawingBufferWidth) * 2 - 1;
}

function canvasToWebGLCoordY(gl: WebGLRenderingContext, y: number): number {
  return (y / gl.drawingBufferHeight) * -2 + 1; // because GL is 0 at bottom
}
