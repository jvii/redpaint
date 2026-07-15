// Algorithms for creating basic geometric shapes.
// * return the shape as an array of Points or Lines
// * no actual drawing or other side effects

import { Point } from '../types';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';

export function line(start: Point, end: Point): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // Steps = the dominant axis's pixel span, not the Euclidean distance —
  // using distance() here (as this once did) over-samples any non-45-degree
  // line, landing more than one step in some columns/rows (duplicate
  // pixels) while unevenly spacing the rest, an uneven, "noisy" look
  // distinct from a clean single-pixel-wide Bresenham-style line.
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist === 0) {
    // just draw a dot
    return [{ x: start.x, y: start.y }];
  }

  const cx = dx / dist;
  const cy = dy / dist;

  const line: Point[] = new Array(dist + 1);

  for (let i = 0; i <= dist; i++) {
    line[i] = { x: Math.floor(start.x + cx * i + 0.5), y: Math.floor(start.y + cy * i + 0.5) };
  }
  return line;
}

export function distance(start: Point, end: Point): number {
  return Math.sqrt((end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y));
}

// Quadratic bezier curve with one control point.
// DPaint used conic curves instead.
export function curve(start: Point, end: Point, middlePoint: Point): Point[] {
  // calculate control point for the bezier curve when middlepoint given
  const controlPoint: Point = {
    x: 2 * middlePoint.x - 0.5 * start.x - 0.5 * end.x,
    y: 2 * middlePoint.y - 0.5 * start.y - 0.5 * end.y,
  };

  const curve: Point[] = [];

  let i: number;
  let previous: Point = start;
  // TODO: get rid of the magic number
  for (i = 0; i <= 1; i = i + 0.02) {
    const current = getQuadraticXY(i, start, controlPoint, end);
    curve.push(...line(previous, current));
    previous = current;
  }
  curve.push(...line(previous, end));

  return curve;
}

function getQuadraticXY(t: number, start: Point, controlPoint: Point, end: Point): Point {
  return {
    x: Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * controlPoint.x + t * t * end.x),
    y: Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * controlPoint.y + t * t * end.y),
  };
}

export function unfilledRect(start: Point, end: Point): (LineH | LineV)[] {
  if (start === end) {
    // just draw a dot
    return [new LineH({ x: start.x, y: start.y }, { x: start.x, y: start.y })];
  }

  // rectangle vertices

  const v1 = start;
  const v2 = { x: start.x, y: end.y };
  const v3 = end;
  const v4 = { x: end.x, y: start.y };

  const rect = [];
  rect.push(new LineV(v1, v2));
  rect.push(new LineH(v2, v3));
  rect.push(new LineV(v3, v4));
  rect.push(new LineH(v4, v1));

  return rect;
}

// eslint-disable-next-line max-len
// adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
export function filledCircle(center: Point, r: number): LineH[] {
  if (r === 0) {
    // just draw a dot
    return [new LineH({ x: center.x, y: center.y }, { x: center.x, y: center.y })];
  }

  let x = r;
  let y = 0;
  let cd = 0;

  const circle: LineH[] = [];
  // middle line
  circle[0] = new LineH(
    { x: center.x - x, y: center.y },
    { x: center.x - x + (r << 1), y: center.y }
  );

  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    circle.push(
      new LineH(
        { x: center.x - y, y: center.y - x },
        { x: center.x - y + (y << 1), y: center.y - x }
      )
    );
    circle.push(
      new LineH(
        { x: center.x - x, y: center.y - y },
        { x: center.x - x + (x << 1), y: center.y - y }
      )
    );
    circle.push(
      new LineH(
        { x: center.x - x, y: center.y + y },
        { x: center.x - x + (x << 1), y: center.y + y }
      )
    );
    circle.push(
      new LineH(
        { x: center.x - y, y: center.y + x },
        { x: center.x - y + (y << 1), y: center.y + x }
      )
    );
  }

  return circle;
}

// eslint-disable-next-line max-len
// adapted from https://stackoverflow.com/questions/45743774/fastest-way-to-draw-and-fill-a-not-anti-aliasing-circle-in-html5canvas
export function unfilledCircle(center: Point, r: number): Point[] {
  if (r === 0) {
    // just draw a dot
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

  // octants
  while (x > y) {
    cd -= --x - ++y;
    if (cd < 0) cd += x++;
    circle.push({ x: center.x - y, y: center.y - x });
    circle.push({ x: center.x - x, y: center.y - y });
    circle.push({ x: center.x - x, y: center.y + y });
    circle.push({ x: center.x - y, y: center.y + x });

    circle.push({ x: center.x + y, y: center.y + x });
    circle.push({ x: center.x + x, y: center.y + y });
    circle.push({ x: center.x + x, y: center.y - y });
    circle.push({ x: center.x + y, y: center.y - x });
  }

  return circle;
}

// The ellipse boundary is a rotated conic
// ((x*cos(phi) + y*sin(phi))^2)/a^2 + ((x*sin(phi) - y*cos(phi))^2)/b^2 = 1
// eslint-disable-next-line max-len
// (https://www.wolframalpha.com/input/?i=%28%28x*cos%28k%29+%2B+y*sin%28k%29%29%5E2%29%2Fa%5E2+%2B+%28%28x*sin%28k%29+-+y*cos%28k%29%29%5E2%29%2Fb%5E2+%3D+1),
// symmetric in x and y. Sampling only "given x, solve for y" undersamples any
// column where the true boundary is steep (nearly vertical) — near-vertical
// stretches can cross several rows within a single integer x step, which a
// single rounded y1/y2 per column can't represent, leaving notches (unfilled)
// or missing rows (filled). Solving the same conic the other way, "given y,
// solve for x", is exactly as accurate but samples finely wherever the first
// form was coarse (and vice versa) — at every point on an ellipse either
// |dy/dx| <= 1 or |dx/dy| <= 1, so the union of both is always complete.

function yGivenX(x: number, a: number, b: number, phi: number): [number, number] {
  const a2 = a ** 2;
  const b2 = b ** 2;
  const ab = a * b;
  const k = 2 * (Math.sin(phi) ** 2 / a2 + Math.cos(phi) ** 2 / b2);
  const sinphicosphi = Math.sin(phi) * Math.cos(phi);
  const cos2phi = Math.cos(2 * phi);
  const c = a2 * cos2phi + a2 - b2 * cos2phi + b2;
  const nominator = Math.sqrt(2) * Math.sqrt(Math.max(0, c - 2 * x ** 2));
  const y1 = nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
  const y2 = -nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
  return [Math.round(y1 / k), Math.round(y2 / k)];
}

function xGivenY(y: number, a: number, b: number, phi: number): [number, number] {
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const coeffA = cosPhi ** 2 / a ** 2 + sinPhi ** 2 / b ** 2;
  const coeffB = 2 * y * sinPhi * cosPhi * (1 / a ** 2 - 1 / b ** 2);
  const coeffC = y ** 2 * (sinPhi ** 2 / a ** 2 + cosPhi ** 2 / b ** 2) - 1;
  const discriminant = Math.max(0, coeffB ** 2 - 4 * coeffA * coeffC);
  const sqrtDiscriminant = Math.sqrt(discriminant);
  const x1 = (-coeffB + sqrtDiscriminant) / (2 * coeffA);
  const x2 = (-coeffB - sqrtDiscriminant) / (2 * coeffA);
  return [Math.round(x1), Math.round(x2)];
}

function ellipseXExtent(a: number, b: number, phi: number): number {
  return Math.sqrt(a ** 2 * Math.cos(phi) ** 2 + b ** 2 * Math.sin(phi) ** 2);
}

function ellipseYExtent(a: number, b: number, phi: number): number {
  return Math.sqrt(a ** 2 * Math.sin(phi) ** 2 + b ** 2 * Math.cos(phi) ** 2);
}

export function unfilledEllipse(
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number
): Point[] {
  const a = radiusX;
  const b = radiusY;
  const phi = rotationAngle * (Math.PI / 180);

  const xExtent = ellipseXExtent(a, b, phi);
  const yExtent = ellipseYExtent(a, b, phi);
  const xStart = Math.ceil(-xExtent);
  const xEnd = -xStart;
  const yStart = Math.ceil(-yExtent);
  const yEnd = -yStart;
  if (xEnd === xStart && yEnd === yStart) {
    return [center];
  }

  // Individual points, not lines: every sample here can be a single isolated
  // pixel (the two boundary points can land on the same row/column), and a
  // zero-length line segment is liable to be dropped by the line rasterizer.

  const ellipse: Point[] = [];

  for (let x = xStart; x <= xEnd; x++) {
    const [y1, y2] = yGivenX(x, a, b, phi);
    ellipse.push({ x: x + center.x, y: y1 + center.y });
    ellipse.push({ x: x + center.x, y: y2 + center.y });
  }

  for (let y = yStart; y <= yEnd; y++) {
    const [x1, x2] = xGivenY(y, a, b, phi);
    ellipse.push({ x: x1 + center.x, y: y + center.y });
    ellipse.push({ x: x2 + center.x, y: y + center.y });
  }

  return ellipse;
}

export function filledEllipse(
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number
): (LineV | LineH)[] {
  const a = radiusX;
  const b = radiusY;
  const phi = rotationAngle * (Math.PI / 180);

  const xExtent = ellipseXExtent(a, b, phi);
  const yExtent = ellipseYExtent(a, b, phi);
  const xStart = Math.ceil(-xExtent);
  const xEnd = -xStart;
  const yStart = Math.ceil(-yExtent);
  const yEnd = -yStart;

  const ellipse: (LineV | LineH)[] = [];

  for (let x = xStart; x <= xEnd; x++) {
    const [y1, y2] = yGivenX(x, a, b, phi);
    const p1 = { x: x + center.x, y: y1 + center.y };
    const p2 = { x: x + center.x, y: y2 + center.y };
    ellipse.push(new LineV(p1, p2));
  }

  for (let y = yStart; y <= yEnd; y++) {
    const [x1, x2] = xGivenY(y, a, b, phi);
    const p1 = { x: x1 + center.x, y: y + center.y };
    const p2 = { x: x2 + center.x, y: y + center.y };
    ellipse.push(new LineH(p1, p2));
  }

  return ellipse;
}

export function unfilledPolygon(vertices: Point[], complete = true): Point[] {
  const unfilledPolygon: Point[] = [];
  for (let i = 1; i < vertices.length; i++) {
    unfilledPolygon.push(...line(vertices[i - 1], vertices[i]));
  }
  if (complete) {
    unfilledPolygon.push(...line(vertices[vertices.length - 1], vertices[0]));
  }
  return unfilledPolygon;
}

// adapted from https://alienryderflex.com/polygon_fill/
// TODO: must also draw the outline of the polygon
export function filledPolygon(vertices: Point[]): LineH[] {
  const filledPolygon: LineH[] = [];

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

    //  Horixontal lines to fill the pixels between node pairs.

    for (i = 0; i < nodes; i += 2) {
      if (nodeX[i] >= imageRight) break;
      if (nodeX[i + 1] > imageLeft) {
        if (nodeX[i] < imageLeft) nodeX[i] = imageLeft;
        if (nodeX[i + 1] > imageRight) nodeX[i + 1] = imageRight;
        const p1: Point = { x: nodeX[i], y: pixelY };
        const p2: Point = { x: nodeX[i + 1], y: pixelY };
        filledPolygon.push(new LineH(p1, p2));
      }
    }
  }

  return filledPolygon;
}
