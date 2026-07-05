import { Line, PaintColor, Point } from '../../types';
import { ALPHA_INDEXED, ALPHA_TRANSPARENT, ALPHA_TRUECOLOR } from '../../domain/CanvasColorIndex';

export function canvasToWebGLCoordX(gl: WebGLRenderingContext, x: number): number {
  return (x / gl.canvas.width) * 2 - 1;
}

export function canvasToWebGLCoordY(gl: WebGLRenderingContext, y: number): number {
  return (y / gl.drawingBufferHeight) * -2 + 1; // because GL is 0 at bottom
}

// Recolors the indexed pixels of a brush texture to the given paint color.
// True-color pixels keep their literal color and transparent pixels (alpha
// tag 0) stay transparent.
export function colorizeTexture(texture: Uint8Array, paintColor: PaintColor): Uint8Array {
  const result = new Uint8Array(texture);
  for (let i = 0; i < result.length; i += 4) {
    if (result[i + 3] === ALPHA_TRUECOLOR || result[i + 3] === ALPHA_TRANSPARENT) {
      continue;
    }
    if (paintColor.kind === 'rgb') {
      result[i] = paintColor.color.r;
      result[i + 1] = paintColor.color.g;
      result[i + 2] = paintColor.color.b;
      result[i + 3] = ALPHA_TRUECOLOR;
    } else {
      result[i] = paintColor.colorNumber - 1; // stored 0-based
      result[i + 1] = 0;
      result[i + 2] = 0;
      result[i + 3] = ALPHA_INDEXED;
    }
  }
  return result;
}

export function shiftPoint(point: Point): Point {
  return { x: point.x + 0.5, y: point.y + 0.5 };
}

export function shiftLine(line: Line): Line {
  const p1XSmaller = line.p1.x < line.p2.x;
  const p1YSmaller = line.p1.y < line.p2.y;
  return {
    p1: { x: line.p1.x + 0.5, y: line.p1.y + 0.5 },
    p2: {
      x: line.p2.x + (p1XSmaller ? 1.5 : 0),
      y: line.p2.y + (p1YSmaller ? 1.5 : 0),
    },
  };
}

// testing, debugging purposes only
export function visualiseTexture(texture: Uint8Array, width: number): void {
  console.log('width: ' + width);
  const indexRedComponent = [];
  for (let i = 0; i < texture.length; i = i + 1) {
    indexRedComponent.push(texture[i]);
  }
  let j = 0;
  let row = '';
  let rowNumber = 1;
  const rows = [];
  for (let i = 0; i < indexRedComponent.length; i++) {
    j++;
    row = row + indexRedComponent[i];
    if (j === width) {
      j = 0;
      rows.unshift(rowNumber + ': ' + row); // unshift as texture y coords start from bottom
      row = '';
      rowNumber++;
    }
  }
  rows.forEach((item, index) => {
    if (index < 100) {
      console.log(item.substring(0, 100));
    }
  });
}
