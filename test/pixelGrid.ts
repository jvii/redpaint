// Rasterizes a shape algorithm's Point[]/Line[] output into a plain 0/1 pixel
// grid, for comparison against (or generation of) a visual PNG fixture. Points
// outside the grid are dropped, same as a real canvas would clip them.

import { Point } from '../src/types';

export type PixelGrid = {
  width: number;
  height: number;
  data: Uint8Array; // 1 = drawn, 0 = background, row-major, top-down
};

function emptyGrid(width: number, height: number): PixelGrid {
  return { width, height, data: new Uint8Array(width * height) };
}

function mark(grid: PixelGrid, point: Point): void {
  if (point.x < 0 || point.x >= grid.width || point.y < 0 || point.y >= grid.height) {
    return;
  }
  grid.data[point.y * grid.width + point.x] = 1;
}

export function rasterizePoints(points: Point[], width: number, height: number): PixelGrid {
  const grid = emptyGrid(width, height);
  for (const point of points) {
    mark(grid, point);
  }
  return grid;
}

export function rasterizeLines(
  lines: { asPoints(): Point[] }[],
  width: number,
  height: number
): PixelGrid {
  const grid = emptyGrid(width, height);
  for (const line of lines) {
    for (const point of line.asPoints()) {
      mark(grid, point);
    }
  }
  return grid;
}
