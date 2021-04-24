import { Point } from '../types';

export class Line {
  readonly p1: Point;
  readonly p2: Point;

  constructor(p1: Point, p2: Point) {
    this.p1 = p1;
    this.p2 = p2;
  }
}
