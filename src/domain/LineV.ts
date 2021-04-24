import { Point } from '../types';
import { Line } from './Line';

export class LineV extends Line {
  constructor(p1: Point, p2: Point) {
    if (p1.x !== p2.x) {
      throw 'Line is not vertical';
    }
    super(p1, p2);
  }

  public asPoints(): Point[] {
    let startY = this.p1.y;
    let endY = this.p2.y;

    if (endY < startY) {
      startY = this.p2.y;
      endY = this.p1.y;
    }

    const lineAsPoints: Point[] = [];
    for (let y = startY; y <= endY; y++) {
      lineAsPoints.push({ x: this.p1.x, y: y });
    }

    return lineAsPoints;
  }
}
