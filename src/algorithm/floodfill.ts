import { overmind } from '..';
import { Point } from '../types';

export function floodFill(
  fillColorIndex: number,
  originPoint: Point,
  canvasColorIndex: Uint8Array
): Point[] {
  const height = overmind.state.canvas.resolution.height;
  const width = overmind.state.canvas.resolution.width;

  // Base color is the original color in originPoint
  const baseColorIndex = getColorIndexForPixel(canvasColorIndex, originPoint, height, width);
  if (fillColorIndex === baseColorIndex) {
    // nothing to do if base color === fill color
    return [];
  }

  // Collect points to fill (return value)
  const pointsToFill: Point[] = [];

  // Add the clicked location to stack
  const stack = [];
  stack.push({ ...originPoint });

  while (stack.length) {
    const position: Point | undefined = stack.pop();
    if (!position) {
      return [];
    }
    let contiguousDown = true; // Vertical is assumed to be true
    let contiguousUp = true; // Vertical is assumed to be true
    let contiguousLeft = false;
    let contiguousRight = false;

    // Move to top most contiguousUp pixel
    while (contiguousUp && position.y >= 0) {
      position.y--;
      contiguousUp =
        getColorIndexForPixel(canvasColorIndex, position, height, width) === baseColorIndex;
    }
    position.y++;

    // Move down
    while (contiguousDown && position.y < height) {
      pointsToFill.push({ x: position.x, y: position.y });
      setColorIndexForPixel(canvasColorIndex, position, fillColorIndex, height, width);

      // Check left
      if (
        position.x - 1 >= 0 &&
        getColorIndexForPixel(
          canvasColorIndex,
          { x: position.x - 1, y: position.y },
          height,
          width
        ) === baseColorIndex
      ) {
        if (!contiguousLeft) {
          contiguousLeft = true;
          stack.push({ x: position.x - 1, y: position.y });
        }
      } else {
        contiguousLeft = false;
      }

      // Check right
      if (
        position.x + 1 < width &&
        getColorIndexForPixel(
          canvasColorIndex,
          { x: position.x + 1, y: position.y },
          height,
          width
        ) === baseColorIndex
      ) {
        if (!contiguousRight) {
          stack.push({ x: position.x + 1, y: position.y });
          contiguousRight = true;
        }
      } else {
        contiguousRight = false;
      }

      position.y++;
      contiguousDown =
        getColorIndexForPixel(canvasColorIndex, position, height, width) === baseColorIndex;
    }
  }

  return pointsToFill;
}

function getColorIndexForPixel(
  colorIndex: Uint8Array,
  pixel: Point,
  height: number,
  width: number
): number {
  const arrayIndex = pixel.x * 4 + (height - pixel.y - 1) * width * 4;
  return colorIndex[arrayIndex];
}

function setColorIndexForPixel(
  colorIndex: Uint8Array,
  pixel: Point,
  colorIndexForPixel: number,
  height: number,
  width: number
) {
  const arrayIndex = pixel.x * 4 + (height - pixel.y - 1) * width * 4;
  colorIndex[arrayIndex] = colorIndexForPixel;
}
