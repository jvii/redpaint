import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import { PaintColor, Point } from '../types';

export function floodFill(
  fillColor: PaintColor,
  originPoint: Point,
  canvasColorIndex: CanvasColorIndex
): Point[] {
  const { width, height } = canvasColorIndex;

  // Base value is the original pixel at originPoint. Pixels are compared as
  // whole 32-bit RGBA values so that true-color pixels compare by their full
  // color, not just the R byte.
  const baseValue = canvasColorIndex.getPixel32(originPoint);
  const fillValue = CanvasColorIndex.packPaintColor(fillColor);
  if (fillValue === baseValue) {
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
      contiguousUp = canvasColorIndex.getPixel32(position) === baseValue;
    }
    position.y++;

    // Move down
    while (contiguousDown && position.y < height) {
      pointsToFill.push({ x: position.x, y: position.y });
      canvasColorIndex.setPixel32(position, fillValue);

      // Check left
      if (
        position.x - 1 >= 0 &&
        canvasColorIndex.getPixel32({ x: position.x - 1, y: position.y }) === baseValue
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
        canvasColorIndex.getPixel32({ x: position.x + 1, y: position.y }) === baseValue
      ) {
        if (!contiguousRight) {
          stack.push({ x: position.x + 1, y: position.y });
          contiguousRight = true;
        }
      } else {
        contiguousRight = false;
      }

      position.y++;
      contiguousDown = canvasColorIndex.getPixel32(position) === baseValue;
    }
  }

  return pointsToFill;
}
