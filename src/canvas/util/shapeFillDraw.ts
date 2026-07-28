import { ShapeGeometry } from '../../algorithm/fillShape';
import { canvasToWebGLCoordX, canvasToWebGLCoordY } from './util';

// The draw call every GPU fill program issues: one triangle-strip quad
// covering the shape's bounding box, which the fragment shader then discards
// outside of. Identical across all four of them (Gradient/Pattern x commit/
// preview), so it lives here rather than four times over — pairs with
// FILL_VERTEX_SHADER (shapeFillShaderLib.ts), the equally shared vertex
// shader it feeds.
//
// Assumes ARRAY_BUFFER is already bound (the canvas controllers bind one
// shared vertex buffer at init and never rebind) and the program is already
// active.
export function drawShapeQuad(
  gl: WebGLRenderingContext,
  aPosition: number,
  geometry: ShapeGeometry
): void {
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // pixel n covers canvas coordinates [n, n+1), so the quad extends to the
  // far edge of the greater pixel (same convention as indexQuad)
  const xLeft = canvasToWebGLCoordX(gl, geometry.left);
  const xRight = canvasToWebGLCoordX(gl, geometry.right + 1);
  const yTop = canvasToWebGLCoordY(gl, geometry.top);
  const yBottom = canvasToWebGLCoordY(gl, geometry.bottom + 1);

  const vertices = new Float32Array([xLeft, yTop, xLeft, yBottom, xRight, yTop, xRight, yBottom]);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
