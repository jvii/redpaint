// Algorithms for composing shapes using primitives

import { Line, Point } from '../types';
import { BrushInterface } from '../brush/Brush';
import { fillRect } from './primitive';
import { CanvasController } from '../core/CanvasController';

export function line(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  start: Point,
  end: Point,
  canvas?: CanvasController
): void {
  const dist = Math.round(distance(start, end));
  if (dist === 0) {
    // just draw a dot
    brush.drawDot(ctx, start, canvas);
    return;
  }

  const cx = (end.x - start.x) / dist;
  const cy = (end.y - start.y) / dist;

  for (let i = 0; i <= dist; i++) {
    brush.drawDot(
      ctx,
      {
        x: Math.floor(start.x + cx * i),
        y: Math.floor(start.y + cy * i),
      },
      canvas
    );
  }
}

export function line2(start: Point, end: Point): Point[] {
  const dist = Math.round(distance(start, end));
  if (dist === 0) {
    // just draw a dot
    //brush.drawDot(ctx, start, canvas);
    return [{ x: start.x, y: start.y }];
  }

  const cx = (end.x - start.x) / dist;
  const cy = (end.y - start.y) / dist;

  const line: Point[] = [];

  for (let i = 0; i <= dist; i++) {
    line.push({ x: Math.floor(start.x + cx * i), y: Math.floor(start.y + cy * i) });
  }
  return line;
}

export function distance(start: Point, end: Point): number {
  return Math.sqrt((end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y));
}

// Quadratic bezier curve with one control point.
// DPaint used conic curves instead.
export function curve(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  start: Point,
  end: Point,
  middlePoint: Point
): void {
  // calculate control point for the bezier curve when middlepoint given
  const controlPoint: Point = {
    x: 2 * middlePoint.x - 0.5 * start.x - 0.5 * end.x,
    y: 2 * middlePoint.y - 0.5 * start.y - 0.5 * end.y,
  };

  let i: number;
  let previous: Point = start;
  // TODO: get rid of the magic number
  for (i = 0; i <= 1; i = i + 0.02) {
    const current = getQuadraticXY(i, start, controlPoint, end);
    line(ctx, brush, previous, current);
    previous = current;
  }
  line(ctx, brush, previous, end);
}

function getQuadraticXY(t: number, start: Point, controlPoint: Point, end: Point): Point {
  return {
    x: Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * controlPoint.x + t * t * end.x),
    y: Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * controlPoint.y + t * t * end.y),
  };
}

export function unfilledRect(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  start: Point,
  end: Point
): void {
  if (start === end) {
    // just draw a dot
    brush.drawDot(ctx, start);
    return;
  }

  // rectangle limits

  const y1 = start.y;
  const y2 = end.y;
  const x1 = start.x;
  const x2 = end.x;

  // draw lines

  brush.drawLineHorizontal(ctx, x1, x2, y1);
  brush.drawLineHorizontal(ctx, x1, x2, y2);
  brush.drawLineVertical(ctx, y1, y2, x1);
  brush.drawLineVertical(ctx, y1, y2, x2);
}

export function filledRect(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  start: Point,
  end: Point
): void {
  if (start === end) {
    // just draw a dot
    fillRect(start.x, start.y, 1, 1, ctx);
    return;
  }

  const width = end.x - start.x;
  const height = end.y - start.y;
  fillRect(start.x, start.y, width, height, ctx);
}

// eslint-disable-next-line max-len
// adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
export function filledCircle(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  center: Point,
  r: number
): void {
  if (r === 0) {
    // just draw a dot
    fillRect(center.x, center.y, 1, 1, ctx);
    return;
  }

  let x = r;
  let y = 0;
  let cd = 0;

  // middle line
  fillRect(center.x - x, center.y, r << 1, 1, ctx);

  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    fillRect(center.x - y, center.y - x, y << 1, 1, ctx); // upper 1/4
    fillRect(center.x - x, center.y - y, x << 1, 1, ctx); // upper 2/4
    fillRect(center.x - x, center.y + y, x << 1, 1, ctx); // lower 3/4
    fillRect(center.x - y, center.y + x, y << 1, 1, ctx); // lower 4/4
  }
}

// eslint-disable-next-line max-len
// adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
export function filledCircle2(center: Point, r: number): Line[] {
  if (r === 0) {
    // just draw a dot
    //fillRect(center.x, center.y, 1, 1, ctx);
    return [
      {
        p1: { x: center.x, y: center.y },
        p2: { x: center.x, y: center.y },
      },
    ];
  }

  let x = r;
  let y = 0;
  let cd = 0;

  const circle: Line[] = [];
  // middle line
  //fillRect(center.x - x, center.y, r << 1, 1, ctx);
  circle[0] = {
    p1: { x: center.x - x, y: center.y },
    p2: { x: center.x - x + (r << 1), y: center.y },
  };

  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    //fillRect(center.x - y, center.y - x, y << 1, 1, ctx); // upper 1/4
    circle.push({
      p1: { x: center.x - y, y: center.y - x },
      p2: { x: center.x - y + (y << 1), y: center.y - x },
    });
    //fillRect(center.x - x, center.y - y, x << 1, 1, ctx); // upper 2/4
    circle.push({
      p1: { x: center.x - x, y: center.y - y },
      p2: { x: center.x - x + (x << 1), y: center.y - y },
    });
    //fillRect(center.x - x, center.y + y, x << 1, 1, ctx); // lower 3/4
    circle.push({
      p1: { x: center.x - x, y: center.y + y },
      p2: { x: center.x - x + (x << 1), y: center.y + y },
    });
    //fillRect(center.x - y, center.y + x, y << 1, 1, ctx); // lower 4/4
    circle.push({
      p1: { x: center.x - y, y: center.y + x },
      p2: { x: center.x - y + (y << 1), y: center.y + x },
    });
  }

  return circle;
}

// eslint-disable-next-line max-len
// adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
export function unfilledCircle(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  center: Point,
  r: number
): void {
  if (r === 0) {
    // just draw a dot
    brush.drawDot(ctx, center);
    return;
  }

  let x = r,
    y = 0,
    cd = 0;

  // middle points
  brush.drawDot(ctx, { x: center.x - x, y: center.y });
  brush.drawDot(ctx, { x: center.x + x, y: center.y });
  brush.drawDot(ctx, { x: center.x, y: center.y - r });
  brush.drawDot(ctx, { x: center.x, y: center.y + r });

  // octants
  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    brush.drawDot(ctx, { x: center.x - y, y: center.y - x });
    brush.drawDot(ctx, { x: center.x - x, y: center.y - y });
    brush.drawDot(ctx, { x: center.x - x, y: center.y + y });
    brush.drawDot(ctx, { x: center.x - y, y: center.y + x });

    brush.drawDot(ctx, { x: center.x + y, y: center.y + x });
    brush.drawDot(ctx, { x: center.x + x, y: center.y + y });
    brush.drawDot(ctx, { x: center.x + x, y: center.y - y });
    brush.drawDot(ctx, { x: center.x + y, y: center.y - x });
  }
}

// eslint-disable-next-line max-len
// adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
export function unfilledCircle2(center: Point, r: number): Point[] {
  if (r === 0) {
    // just draw a dot
    //brush.drawDot(ctx, center);
    return [center];
  }

  let x = r,
    y = 0,
    cd = 0;

  const circle: Point[] = [];

  // middle points
  circle.push({ x: center.x - x, y: center.y });
  circle.push({ x: center.x + x, y: center.y });
  circle.push({ x: center.x, y: center.y - r });
  circle.push({ x: center.x, y: center.y + r });
  /*   brush.drawDot(ctx, { x: center.x - x, y: center.y });
  brush.drawDot(ctx, { x: center.x + x, y: center.y });
  brush.drawDot(ctx, { x: center.x, y: center.y - r });
  brush.drawDot(ctx, { x: center.x, y: center.y + r }); */

  // octants
  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    circle.push({ x: center.x - y, y: center.y - x });
    circle.push({ x: center.x - x, y: center.y - y });
    circle.push({ x: center.x - x, y: center.y + y });
    circle.push({ x: center.x - y, y: center.y + x });
    /*     brush.drawDot(ctx, { x: center.x - y, y: center.y - x });
    brush.drawDot(ctx, { x: center.x - x, y: center.y - y });
    brush.drawDot(ctx, { x: center.x - x, y: center.y + y });
    brush.drawDot(ctx, { x: center.x - y, y: center.y + x }); */

    circle.push({ x: center.x + y, y: center.y + x });
    circle.push({ x: center.x + x, y: center.y + y });
    circle.push({ x: center.x + x, y: center.y - y });
    circle.push({ x: center.x + y, y: center.y - x });
    /*     brush.drawDot(ctx, { x: center.x + y, y: center.y + x });
    brush.drawDot(ctx, { x: center.x + x, y: center.y + y });
    brush.drawDot(ctx, { x: center.x + x, y: center.y - y });
    brush.drawDot(ctx, { x: center.x + y, y: center.y - x }); */
  }

  return circle;
}

export function unfilledEllipse(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number
): void {
  // eslint-disable-next-line max-len
  // https://www.wolframalpha.com/input/?i=%28%28x*cos%28k%29+%2B+y*sin%28k%29%29%5E2%29%2Fa%5E2+%2B+%28%28x*sin%28k%29+-+y*cos%28k%29%29%5E2%29%2Fb%5E2+%3D+1
  const a = radiusX;
  const b = radiusY;
  const phi = rotationAngle * (Math.PI / 180);

  const xStart = Math.ceil(-Math.sqrt(a ** 2 * Math.cos(phi) ** 2 + b ** 2 * Math.sin(phi) ** 2));
  const xEnd = -xStart;
  if (xEnd === xStart) {
    return;
  }

  // Define some constants for calculation

  const a2 = a ** 2;
  const b2 = b ** 2;
  const ab = a * b;
  const k = 2 * (Math.sin(phi) ** 2 / a2 + Math.cos(phi) ** 2 / b2);
  const sinphicosphi = Math.sin(phi) * Math.cos(phi);
  const cos2phi = Math.cos(2 * phi);
  const c = a2 * cos2phi + a2 - b2 * cos2phi + b2;
  const sqrt2 = Math.sqrt(2);

  // Calculate y points of ellipse given x points

  const ellipsePointsLowerHalf: Point[] = [];
  const ellipsePointsUpperHalf: Point[] = [];
  for (let x = xStart; x <= xEnd; x++) {
    const nominator = sqrt2 * Math.sqrt(c - 2 * x ** 2);
    let y1 = nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
    y1 = Math.round(y1 / k);
    let y2 = -nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
    y2 = Math.round(y2 / k);
    ellipsePointsLowerHalf.push({ x: x + center.x, y: y1 + center.y });
    ellipsePointsUpperHalf.push({ x: x + center.x, y: y2 + center.y });
  }

  // Draw ellipse

  // Lower half

  for (let i = 1; i < ellipsePointsLowerHalf.length - 1; i++) {
    const point = ellipsePointsLowerHalf[i];
    const previousPoint = ellipsePointsLowerHalf[i - 1];
    const nextPoint = ellipsePointsLowerHalf[i + 1];
    if (point.y > previousPoint.y + 1) {
      brush.drawLineVertical(ctx, previousPoint.y + 1, point.y, point.x);
    } else if (point.y > nextPoint.y + 1) {
      brush.drawLineVertical(ctx, nextPoint.y + 1, point.y, point.x);
    } else {
      brush.drawDot(ctx, point);
    }
  }

  // Upper half

  for (let i = 1; i < ellipsePointsUpperHalf.length - 1; i++) {
    const point = ellipsePointsUpperHalf[i];
    const previousPoint = ellipsePointsUpperHalf[i - 1];
    const nextPoint = ellipsePointsUpperHalf[i + 1];
    if (point.y < previousPoint.y - 1) {
      brush.drawLineVertical(ctx, point.y, previousPoint.y - 1, point.x);
    } else if (point.y < nextPoint.y - 1) {
      brush.drawLineVertical(ctx, point.y, nextPoint.y - 1, point.x);
    } else {
      brush.drawDot(ctx, point);
    }
  }

  // Close both ends of ellipse by drawing a vertical line at x = 0 and x = length - 1

  const startYLower = ellipsePointsLowerHalf[0].y;
  const startYUpper = ellipsePointsUpperHalf[0].y;
  const startX = ellipsePointsUpperHalf[0].x;
  brush.drawLineVertical(ctx, startYLower, startYUpper - 1, startX);
  brush.drawDot(ctx, ellipsePointsLowerHalf[0]);

  const endYLower = ellipsePointsLowerHalf[ellipsePointsUpperHalf.length - 1].y;
  const endYUpper = ellipsePointsUpperHalf[ellipsePointsUpperHalf.length - 1].y;
  const endX = ellipsePointsUpperHalf[ellipsePointsUpperHalf.length - 1].x;
  brush.drawLineVertical(ctx, endYLower, endYUpper - 1, endX);
  brush.drawDot(ctx, ellipsePointsLowerHalf[ellipsePointsUpperHalf.length - 1]);
}

export function filledEllipse(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number
): void {
  // eslint-disable-next-line max-len
  // https://www.wolframalpha.com/input/?i=%28%28x*cos%28k%29+%2B+y*sin%28k%29%29%5E2%29%2Fa%5E2+%2B+%28%28x*sin%28k%29+-+y*cos%28k%29%29%5E2%29%2Fb%5E2+%3D+1
  const a = radiusX;
  const b = radiusY;
  const phi = rotationAngle * (Math.PI / 180);

  const xStart = Math.ceil(-Math.sqrt(a ** 2 * Math.cos(phi) ** 2 + b ** 2 * Math.sin(phi) ** 2));
  const xEnd = -xStart;

  // Define some constants for calculation

  const a2 = a ** 2;
  const b2 = b ** 2;
  const ab = a * b;
  const k = 2 * (Math.sin(phi) ** 2 / a2 + Math.cos(phi) ** 2 / b2);
  const sinphicosphi = Math.sin(phi) * Math.cos(phi);
  const cos2phi = Math.cos(2 * phi);
  const c = a2 * cos2phi + a2 - b2 * cos2phi + b2;
  const sqrt2 = Math.sqrt(2);

  for (let x = xStart; x <= xEnd; x++) {
    const nominator = sqrt2 * Math.sqrt(c - 2 * x ** 2);
    let y1 = nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
    y1 = Math.round(y1 / k);
    let y2 = -nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
    y2 = Math.round(y2 / k);
    const h = Math.abs(y1 - y2);

    fillRect(x + center.x, y1 + center.y, 1, -h, ctx);
  }
}

export function unfilledPolygon(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  vertices: Point[],
  complete = true
): void {
  for (let i = 1; i < vertices.length; i++) {
    brush.drawLine(ctx, vertices[i - 1], vertices[i]);
  }
  if (complete) {
    brush.drawLine(ctx, vertices[vertices.length - 1], vertices[0]);
  }
}

// adapted from https://alienryderflex.com/polygon_fill/
// TODO: must also draw the outline of the polygon
export function filledPolygon(
  ctx: CanvasRenderingContext2D,
  brush: BrushInterface,
  vertices: Point[]
): void {
  // first draw the outline
  //unfilledPolygon(ctx, new PixelBrush(), vertices);

  const imageTop = Math.min(...vertices.map((point): number => point.y));
  const imageBottom = Math.max(...vertices.map((point): number => point.y));
  const imageLeft = Math.min(...vertices.map((point): number => point.x));
  const imageRight = Math.max(...vertices.map((point): number => point.x));

  const nodeX: number[] = [];

  //  Loop through the rows of the image.
  for (let pixelY = imageTop; pixelY < imageBottom; pixelY++) {
    //  Build a list of nodes.
    let nodes = 0;
    const polyCorners = vertices.length;
    let j = polyCorners - 1;
    for (let i = 0; i < polyCorners; i++) {
      if (
        (vertices[i].y < pixelY && vertices[j].y >= pixelY) ||
        (vertices[j].y < pixelY && vertices[i].y >= pixelY)
      ) {
        nodeX[nodes++] = Math.round(
          vertices[i].x +
            ((pixelY - vertices[i].y) / (vertices[j].y - vertices[i].y)) *
              (vertices[j].x - vertices[i].x)
        );
      }
      j = i;
    }

    //  Sort the nodes, via a simple Bubble sort.
    let i = 0;
    while (i < nodes - 1) {
      if (nodeX[i] > nodeX[i + 1]) {
        const swap = nodeX[i];
        nodeX[i] = nodeX[i + 1];
        nodeX[i + 1] = swap;
        if (i) i--;
      } else {
        i++;
      }
    }

    //  Fill the pixels between node pairs.
    for (i = 0; i < nodes; i += 2) {
      if (nodeX[i] >= imageRight) break;
      if (nodeX[i + 1] > imageLeft) {
        if (nodeX[i] < imageLeft) nodeX[i] = imageLeft;
        if (nodeX[i + 1] > imageRight) nodeX[i + 1] = imageRight;
        fillRect(nodeX[i], pixelY, nodeX[i + 1] - nodeX[i], 1, ctx);
      }
    }
  }
}
