import { Brush } from './Brush';
import { Color, Point } from '../types';
import { colorToRGBString, distance } from '../tools/util';

export class PixelBrush implements Brush {
  public drawLine(canvas: HTMLCanvasElement, color: Color, start: Point, end: Point): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = colorToRGBString(color);
    //const dist = distance(start, end);
    let dist = Math.round(distance(start, end));
    if (dist === 0) {
      dist = 1; // does dpaint draw a point with line tool?
    }
    for (let i = 0; i <= dist; i++) {
      ctx.fillRect(
        Math.floor(start.x + ((end.x - start.x) / dist) * i), // round to avoid anti-aliasing
        Math.floor(start.y + ((end.y - start.y) / dist) * i),
        1,
        1
      );
    }

    const originOfSymmetry: Point = {
      x: Math.round(canvas.width / 2),
      y: Math.round(canvas.height / 2),
    };

    // mirror x and y
    const start2 = {
      x: originOfSymmetry.x + originOfSymmetry.x - start.x,
      y: originOfSymmetry.y + originOfSymmetry.y - start.y,
    };
    const end2 = {
      x: originOfSymmetry.x + originOfSymmetry.x - end.x,
      y: originOfSymmetry.y + originOfSymmetry.y - end.y,
    };
    const dist2 = distance(start2, end2);
    for (let i = 0; i < dist2; i++) {
      ctx.fillRect(
        Math.floor(start2.x + ((end2.x - start2.x) / dist2) * i), // round to avoid anti-aliasing
        Math.floor(start2.y + ((end2.y - start2.y) / dist2) * i),
        1,
        1
      );
    }

    // mirror x

    const start3 = {
      x: originOfSymmetry.x + originOfSymmetry.x - start.x,
      y: start.y,
    };
    const end3 = {
      x: originOfSymmetry.x + originOfSymmetry.x - end.x,
      y: end.y,
    };

    const dist3 = distance(start3, end3);
    for (let i = 0; i < dist3; i++) {
      ctx.fillRect(
        Math.floor(start3.x + ((end3.x - start3.x) / dist3) * i), // round to avoid anti-aliasing
        Math.floor(start3.y + ((end3.y - start3.y) / dist3) * i),
        1,
        1
      );
    }

    // mirror y

    const start4 = {
      x: start.x,
      y: originOfSymmetry.y + originOfSymmetry.y - start.y,
    };
    const end4 = {
      x: end.x,
      y: originOfSymmetry.y + originOfSymmetry.y - end.y,
    };

    const dist4 = distance(start4, end4);
    for (let i = 0; i < dist4; i++) {
      ctx.fillRect(
        Math.floor(start4.x + ((end4.x - start4.x) / dist4) * i), // round to avoid anti-aliasing
        Math.floor(start4.y + ((end4.y - start4.y) / dist4) * i),
        1,
        1
      );
    }
  }

  public drawDot(canvas: HTMLCanvasElement, color: Color, point: Point): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = colorToRGBString(color);
    ctx.fillRect(Math.floor(point.x), Math.floor(point.y), 1, 1);
  }
}
