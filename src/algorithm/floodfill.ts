import { overmind } from '..';
import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import { Point } from '../types';

export function floodFill(
  fillColorNumber: number,
  originPoint: Point,
  canvasColorIndex: CanvasColorIndex
): Point[] {
  const height = overmind.state.canvas.resolution.height;
  const width = overmind.state.canvas.resolution.width;

  // Base color is the original color in originPoint
  const baseColorNumber = canvasColorIndex.getColorNumberForPixel(originPoint, height, width);
  if (fillColorNumber === baseColorNumber) {
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
        canvasColorIndex.getColorNumberForPixel(position, height, width) === baseColorNumber;
    }
    position.y++;

    // Move down
    while (contiguousDown && position.y < height) {
      pointsToFill.push({ x: position.x, y: position.y });
      canvasColorIndex.setColorNumberForPixel(position, fillColorNumber, height, width);

      // Check left
      if (
        position.x - 1 >= 0 &&
        canvasColorIndex.getColorNumberForPixel(
          { x: position.x - 1, y: position.y },
          height,
          width
        ) === baseColorNumber
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
        canvasColorIndex.getColorNumberForPixel(
          { x: position.x + 1, y: position.y },
          height,
          width
        ) === baseColorNumber
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
        canvasColorIndex.getColorNumberForPixel(position, height, width) === baseColorNumber;
    }
  }

  return pointsToFill;
}
