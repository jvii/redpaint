import { Point, Color } from '../types';

export function colorToRGBString(color: Color): string {
  return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
}

export function drawLine(canvas: HTMLCanvasElement, color: Color, start: Point, end: Point): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return;
  }

  ctx.strokeStyle = colorToRGBString(color);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}
