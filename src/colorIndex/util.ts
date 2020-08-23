export function canvasToWebGLCoordX(gl: WebGLRenderingContext, x: number): number {
  return (x / gl.drawingBufferWidth) * 2 - 1;
}

export function canvasToWebGLCoordY(gl: WebGLRenderingContext, y: number): number {
  return (y / gl.drawingBufferHeight) * -2 + 1; // because GL is 0 at bottom
}
