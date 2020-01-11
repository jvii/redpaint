import { Point } from '../types';
import { Brush } from '../brush/Brush';
import { OvermindState } from '../overmind';

export function distance(start: Point, end: Point): number {
  return Math.sqrt((end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y));
}

export function line(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  start: Point,
  end: Point,
  state: OvermindState
): void {
  // TODO: can be optimized to use fillRect if drawing horizontal or vertical lines
  let dist = Math.round(distance(start, end));
  if (dist === 0) {
    // just draw a dot
    brush.draw(start, ctx, state);
    return;
  }

  for (let i = 0; i <= dist; i++) {
    brush.draw(
      {
        x: start.x + ((end.x - start.x) / dist) * i,
        y: start.y + ((end.y - start.y) / dist) * i,
      },
      ctx,
      state
    );
  }
}

export function unfilledRect(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  start: Point,
  end: Point,
  state: OvermindState
): void {
  if (start === end) {
    // just draw a dot
    brush.draw(start, ctx, state);
    return;
  }

  // calculate rectangle corner points

  const point1 = start;
  const point2 = { x: end.x, y: start.y };
  const point3 = end;
  const point4 = { x: start.x, y: end.y };

  // draw lines

  line(ctx, brush, point1, point2, state);
  line(ctx, brush, point2, point3, state);
  line(ctx, brush, point3, point4, state);
  line(ctx, brush, point4, point1, state);
}

export function filledRect(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  start: Point,
  end: Point,
  state: OvermindState
): void {
  if (start === end) {
    // just draw a dot
    brush.draw(start, ctx, state);
    return;
  }

  const width = end.x - start.x;
  const height = end.y - start.y;
  //ctx.fillRect(start.x, start.y, width, height);
  fillRectWithSymmetry(start.x, start.y, width, height, ctx, state);
}

export function filledCircle(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  center: Point,
  r: number,
  state: OvermindState
): void {
  // adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas

  if (r === 0) {
    // just draw a dot
    brush.draw(center, ctx, state);
    return;
  }

  let x = r,
    y = 0,
    cd = 0;

  // middle line
  //ctx.fillRect(center.x - x, center.y, r << 1, 1);
  fillRectWithSymmetry(center.x - x, center.y, r << 1, 1, ctx, state);

  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    //ctx.fillRect(center.x - y, center.y - x, y << 1, 1); // upper 1/4
    fillRectWithSymmetry(center.x - y, center.y - x, y << 1, 1, ctx, state);
    //ctx.fillRect(center.x - x, center.y - y, x << 1, 1); // upper 2/4
    fillRectWithSymmetry(center.x - x, center.y - y, x << 1, 1, ctx, state);
    //ctx.fillRect(center.x - x, center.y + y, x << 1, 1); // lower 3/4
    fillRectWithSymmetry(center.x - x, center.y + y, x << 1, 1, ctx, state);
    //ctx.fillRect(center.x - y, center.y + x, y << 1, 1); // lower 4/4
    fillRectWithSymmetry(center.x - y, center.y + x, y << 1, 1, ctx, state);
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

  if (r === 0) {
    // just draw a dot
    brush.draw(center, ctx, state);
    return;
  }

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

export function fillRectWithSymmetry(
  x: number,
  y: number,
  w: number,
  h: number,
  ctx: CanvasRenderingContext2D,
  state: OvermindState
): void {
  ctx.fillRect(x, y, w, h);

  if (!state.toolbar.symmetryModeOn) {
    return;
  }

  const originOfSymmetry: Point = {
    x: Math.round(ctx.canvas.width / 2),
    y: Math.round(ctx.canvas.height / 2),
  };

  // mirror x and y
  const sym1 = {
    x: originOfSymmetry.x + originOfSymmetry.x - x,
    y: originOfSymmetry.y + originOfSymmetry.y - y,
  };

  // mirror x
  const sym2 = {
    x: originOfSymmetry.x + originOfSymmetry.x - x,
    y: y,
  };

  // mirror y
  const sym3 = {
    x: x,
    y: originOfSymmetry.y + originOfSymmetry.y - y,
  };

  ctx.fillRect(Math.floor(sym1.x), Math.floor(sym1.y), -w, -h);
  ctx.fillRect(Math.floor(sym2.x), Math.floor(sym2.y), -w, h);
  ctx.fillRect(Math.floor(sym3.x), Math.floor(sym3.y), w, -h);
}
