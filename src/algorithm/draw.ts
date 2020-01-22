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
  // TODO: horizontal or vertical lines could be further optimized (quick distance, fillRect for pixel brush)
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

// Quadratic bezier curve with one control point.
// DPaint used conic curves instead.
export function curve(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  start: Point,
  end: Point,
  middlePoint: Point,
  state: OvermindState
): void {
  // calculate control point for the bezier curve when middlepoint given
  let controlPoint: Point = {
    x: 2 * middlePoint.x - 0.5 * start.x - 0.5 * end.x,
    y: 2 * middlePoint.y - 0.5 * start.y - 0.5 * end.y,
  };

  let i: number;
  let previous: Point = start;
  for (i = 0; i <= 1; i = i + 0.02) {
    let current = getQuadraticXY(i, start, controlPoint, end);
    line(ctx, brush, previous, current, state);
    previous = current;
  }
  line(ctx, brush, previous, end, state);
}

function getQuadraticXY(t: number, start: Point, controlPoint: Point, end: Point): Point {
  return {
    x: Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * controlPoint.x + t * t * end.x),
    y: Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * controlPoint.y + t * t * end.y),
  };
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
  if (start == end) {
    // just draw a dot
    fillRectWithSymmetry(start.x, start.y, 1, 1, ctx, state);
    return;
  }

  const width = end.x - start.x;
  const height = end.y - start.y;
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
    fillRectWithSymmetry(center.x, center.y, 1, 1, ctx, state);
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

export function unfilledEllipse(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number,
  state: OvermindState
): void {
  let previous: Point = { x: 0, y: 0 };
  for (let i = 0; i < 2 * Math.PI; i += 0.01) {
    let xPos = Math.round(
      center.x -
        radiusY * Math.sin(i) * Math.sin(rotationAngle * Math.PI) +
        radiusX * Math.cos(i) * Math.cos(rotationAngle * Math.PI)
    );
    let yPos = Math.round(
      center.y +
        radiusX * Math.cos(i) * Math.sin(rotationAngle * Math.PI) +
        radiusY * Math.sin(i) * Math.cos(rotationAngle * Math.PI)
    );

    if (i > 0) {
      line(ctx, brush, previous, { x: xPos, y: yPos }, state);
    }
    previous = { x: xPos, y: yPos };
  }
}

export function filledEllipse(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number,
  state: OvermindState
): void {
  const a = radiusX;
  const b = radiusY;
  const phi = rotationAngle * (Math.PI / 180);

  const xStart = Math.ceil(-Math.sqrt(a ** 2 * Math.cos(phi) ** 2 + b ** 2 * Math.sin(phi) ** 2));
  const xEnd = -xStart;

  const a2 = a ** 2;
  const b2 = b ** 2;
  const k = 2 * (Math.sin(phi) ** 2 / a2 + Math.cos(phi) ** 2 / b2);
  const cos2phi = Math.cos(2 * phi);
  const sinphicosphi = Math.sin(phi) * Math.cos(phi);

  for (let x = xStart; x <= xEnd; x++) {
    let nominator = Math.sqrt(2) * Math.sqrt(a2 * cos2phi + a2 - b2 * cos2phi + b2 - 2 * x ** 2);
    let y1 = nominator / (a * b) - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
    y1 = Math.round(y1 / k);
    let y2 = -nominator / (a * b) - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
    y2 = Math.round(y2 / k);
    let h = Math.abs(y1 - y2);

    fillRectWithSymmetry(x + center.x, y1 + center.y, 1, -h, ctx, state);
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
