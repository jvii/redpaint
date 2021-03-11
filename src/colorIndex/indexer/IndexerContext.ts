export function createIndexerGLContext(
  width: number,
  height: number,
  backgroundColorId: number
): WebGLRenderingContext {
  // init a webgl context for a canvas element outside the DOM

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true,
    antialias: false,
  });

  if (!gl) {
    alert('Sorry, ReDPaint requires WebGL support:(');
    throw 'Sorry, ReDPaint requires WebGL support';
  }

  // create a texture to render to: TODO: why do we need a texture to render to here?

  /* const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const targetTextureWidth = gl.drawingBufferWidth;
  const targetTextureHeight = gl.drawingBufferHeight;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  // initialize the color index matrix with the initial background color
  const backgroundColor = Number(backgroundColorId);
  const data = new Uint8Array(gl.drawingBufferHeight * gl.drawingBufferWidth * 4).fill(
    backgroundColor
  );
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

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // create and bind the framebuffer

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // attach the texture as the first color attachment

  const attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level); */

  console.log('Indexer webgl context initialized');

  return gl;
}
