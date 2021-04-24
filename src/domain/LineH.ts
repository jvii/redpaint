import { Point } from '../types';
import { Line } from './Line';

export class LineH extends Line {
  constructor(p1: Point, p2: Point) {
    if (p1.y !== p2.y) {
      throw 'Line is not horizontal';
    }
    super(p1, p2);
  }

  public asPoints(): Point[] {
    let startX = this.p1.x;
    let endX = this.p2.x;

    if (endX < startX) {
      startX = this.p2.x;
      endX = this.p1.x;
    }

    const lineAsPoints: Point[] = [];
    for (let x = startX; x <= endX; x++) {
      lineAsPoints.push({ x: x, y: this.p1.y });
    }

    return lineAsPoints;
  }
}
