import { Point } from '../types';

export function drawLine(canvas: HTMLCanvasElement, start: Point, end: Point): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}
