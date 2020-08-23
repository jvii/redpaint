// We only use two actual drawing methods from the 2d canvas api:
// fillRect and drawImage.
// These are our so called 'primitives' that all draw operations must
// call to draw to canvas.

import { Point } from '../types';
import { overmind } from '../index';
import { CustomBrush } from '../brush/CustomBrush';
import { indexFillRect, indexDrawImage } from '../colorIndex/ColorIndexer';

export function fillRect(
  x: number,
  y: number,
  w: number,
  h: number,
  ctx: CanvasRenderingContext2D
): void {
  ctx.fillRect(x, y, w, h);

  if (ctx.canvas.className === 'canvas') {
    indexFillRect(x, y, w, h, overmind.state.tool.activeColorIndex);
  }

  if (!overmind.state.toolbox.symmetryModeOn) {
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

export function drawImage(point: Point, brush: CustomBrush, ctx: CanvasRenderingContext2D): void {
  ctx.drawImage(brush.brushImage, Math.floor(point.x), Math.floor(point.y));

  if (ctx.canvas.className === 'canvas') {
    indexDrawImage(Math.floor(point.x), Math.floor(point.y), brush);
  }

  if (!overmind.state.toolbox.symmetryModeOn) {
    return;
  }

  const originOfSymmetry: Point = {
    x: Math.round(ctx.canvas.width / 2),
    y: Math.round(ctx.canvas.height / 2),
  };

  // mirror x and y
  const sym1 = {
    x: originOfSymmetry.x + originOfSymmetry.x - point.x,
    y: originOfSymmetry.y + originOfSymmetry.y - point.y,
  };

  // mirror x
  const sym2 = {
    x: originOfSymmetry.x + originOfSymmetry.x - point.x,
    y: point.y,
  };

  // mirror y
  const sym3 = {
    x: point.x,
    y: originOfSymmetry.y + originOfSymmetry.y - point.y,
  };

  ctx.drawImage(brush.brushImage, Math.floor(sym1.x), Math.floor(sym1.y));
  ctx.drawImage(brush.brushImage, Math.floor(sym2.x), Math.floor(sym2.y));
  ctx.drawImage(brush.brushImage, Math.floor(sym3.x), Math.floor(sym3.y));
}
