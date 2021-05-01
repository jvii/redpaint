// Algorithms for creating basic geometric shapes.
// * return the shape as an array of Points or Lines
// * no actual drawing or other side effects

import { Point } from '../types';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';

export function line(start: Point, end: Point): Point[] {
  const dist = Math.round(distance(start, end));
  if (dist === 0) {
    // just draw a dot
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

export function unfilledEllipse(
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number
): LineV[] {
  // eslint-disable-next-line max-len
  // https://www.wolframalpha.com/input/?i=%28%28x*cos%28k%29+%2B+y*sin%28k%29%29%5E2%29%2Fa%5E2+%2B+%28%28x*sin%28k%29+-+y*cos%28k%29%29%5E2%29%2Fb%5E2+%3D+1
  const a = radiusX;
  const b = radiusY;
  const phi = rotationAngle * (Math.PI / 180);

  const xStart = Math.ceil(-Math.sqrt(a ** 2 * Math.cos(phi) ** 2 + b ** 2 * Math.sin(phi) ** 2));
  const xEnd = -xStart;
  if (xEnd === xStart) {
    return [new LineV(center, center)];
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

  // Collect ellipse lines

  const ellipse: LineV[] = [];

  // Lower half

  for (let i = 1; i < ellipsePointsLowerHalf.length - 1; i++) {
    const point = ellipsePointsLowerHalf[i];
    const previousPoint = ellipsePointsLowerHalf[i - 1];
    const nextPoint = ellipsePointsLowerHalf[i + 1];
    if (point.y > previousPoint.y + 1) {
      ellipse.push(new LineV({ x: point.x, y: previousPoint.y + 1 }, point));
    } else if (point.y > nextPoint.y + 1) {
      ellipse.push(new LineV({ x: point.x, y: nextPoint.y + 1 }, point));
    } else {
      ellipse.push(new LineV(point, point));
    }
  }

  // Upper half

  for (let i = 1; i < ellipsePointsUpperHalf.length - 1; i++) {
    const point = ellipsePointsUpperHalf[i];
    const previousPoint = ellipsePointsUpperHalf[i - 1];
    const nextPoint = ellipsePointsUpperHalf[i + 1];
    if (point.y < previousPoint.y - 1) {
      ellipse.push(new LineV({ x: point.x, y: previousPoint.y - 1 }, point));
    } else if (point.y < nextPoint.y - 1) {
      ellipse.push(new LineV({ x: point.x, y: nextPoint.y - 1 }, point));
    } else {
      ellipse.push(new LineV(point, point));
    }
  }

  // Close both ends of ellipse by drawing a vertical line at x = 0 and x = length - 1

  ellipse.push(new LineV(ellipsePointsLowerHalf[0], ellipsePointsUpperHalf[0]));
  ellipse.push(
    new LineV(
      ellipsePointsLowerHalf[ellipsePointsUpperHalf.length - 1],
      ellipsePointsUpperHalf[ellipsePointsUpperHalf.length - 1]
    )
  );

  return ellipse;
}

export function filledEllipse(
  center: Point,
  radiusX: number,
  radiusY: number,
  rotationAngle: number
): LineV[] {
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

  // Collect ellipse lines

  const ellipse: LineV[] = [];

  for (let x = xStart; x <= xEnd; x++) {
    const nominator = sqrt2 * Math.sqrt(c - 2 * x ** 2);
    const y1 = nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;
    const y2 = -nominator / ab - (2 * x * sinphicosphi) / a2 + (2 * x * sinphicosphi) / b2;

    const p1 = { x: x + center.x, y: Math.round(y1 / k) + center.y };
    const p2 = { x: x + center.x, y: Math.round(y2 / k) + center.y };

    ellipse.push(new LineV(p1, p2));
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
