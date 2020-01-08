import { Point } from '../types';
import { Brush } from '../brush/Brush';
import { OvermindState } from '../overmind';

export function filledCircle(ctx: CanvasRenderingContext2D, center: Point, r: number): void {
  // adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
  let x = r,
    y = 0,
    cd = 0;

  // middle line
  ctx.fillRect(center.x - x, center.y, r << 1, 1);

  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    ctx.fillRect(center.x - y, center.y - x, y << 1, 1); // upper 1/4
    ctx.fillRect(center.x - x, center.y - y, x << 1, 1); // upper 2/4
    ctx.fillRect(center.x - x, center.y + y, x << 1, 1); // lower 3/4
    ctx.fillRect(center.x - y, center.y + x, y << 1, 1); // lower 4/4
  }
}

export function unfilledCircle(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  center: Point,
  r: number,
  state: OvermindState
): void {
  // adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
  let x = r,
    y = 0,
    cd = 0;

  // middle points
  brush.draw({ x: center.x - x, y: center.y }, ctx, state);
  brush.draw({ x: center.x + x, y: center.y }, ctx, state);
  brush.draw({ x: center.x, y: center.y - r }, ctx, state);
  brush.draw({ x: center.x, y: center.y + r }, ctx, state);

  // octants
  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    brush.draw({ x: center.x - y, y: center.y - x }, ctx, state);
    brush.draw({ x: center.x - x, y: center.y - y }, ctx, state);
    brush.draw({ x: center.x - x, y: center.y + y }, ctx, state);
    brush.draw({ x: center.x - y, y: center.y + x }, ctx, state);

    brush.draw({ x: center.x + y, y: center.y + x }, ctx, state);
    brush.draw({ x: center.x + x, y: center.y + y }, ctx, state);
    brush.draw({ x: center.x + x, y: center.y - y }, ctx, state);
    brush.draw({ x: center.x + y, y: center.y - x }, ctx, state);
  }
}
