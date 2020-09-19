export function createRendererGLContext(width: number, height: number): WebGLRenderingContext {
  // init a webgl context for a canvas element outside the DOM

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: false,
    antialias: false,
  });

  if (!gl) {
    alert('Sorry, ReDPaint requires WebGL support:(');
    throw 'Sorry, ReDPaint requires WebGL support';
  }

  console.log('Renderer webgl context initialized');

  return gl;
}
