// These methods are our so called 'primitives' that all draw operations must
// call to draw to canvas.
// We only use two actual drawing methods from the 2d canvas api:
//  * fillRect
//  * drawImage

import { Point } from '../types';
import { overmind } from '../index';
import { CustomBrush } from '../brush/CustomBrush';
//import { indexFillRect, indexDrawImage } from '../colorIndex/ColorIndexer';

export function fillRect(
  x: number,
  y: number,
  w: number,
  h: number,
  ctx: CanvasRenderingContext2D
): void {
  // draw and index

  ctx.fillRect(x, y, w, h);
  /*   if (ctx.canvas.className === 'canvas') {
    indexFillRect(x, y, w, h, overmind.state.tool.activeColorIndex);
  } */

  // handle symmetry

  if (!overmind.state.toolbox.symmetryModeOn) {
    return;
  }

  const originOfSymmetry: Point = {
    x: Math.round(ctx.canvas.width / 2),
    y: Math.round(ctx.canvas.height / 2),
  };

  // mirror x and y
  const sym1 = {
    x: Math.floor(originOfSymmetry.x + originOfSymmetry.x - x),
    y: Math.floor(originOfSymmetry.y + originOfSymmetry.y - y),
  };

  // mirror x
  const sym2 = {
    x: Math.floor(originOfSymmetry.x + originOfSymmetry.x - x),
    y: y,
  };

  // mirror y
  const sym3 = {
    x: x,
    y: Math.floor(originOfSymmetry.y + originOfSymmetry.y - y),
  };

  // draw and index (symmetry)

  ctx.fillRect(sym1.x, sym1.y, -w, -h);
  ctx.fillRect(sym2.x, sym2.y, -w, h);
  ctx.fillRect(sym3.x, sym3.y, w, -h);
  /*   if (ctx.canvas.className === 'canvas') {
    indexFillRect(sym1.x, sym1.y, -w, -h, overmind.state.tool.activeColorIndex);
    indexFillRect(sym2.x, sym2.y, -w, h, overmind.state.tool.activeColorIndex);
    indexFillRect(sym3.x, sym3.y, w, -h, overmind.state.tool.activeColorIndex);
  } */
}

export function drawImage(point: Point, brush: CustomBrush, ctx: CanvasRenderingContext2D): void {
  // draw and index

  ctx.drawImage(brush.brushImage, Math.floor(point.x), Math.floor(point.y));
  /*   if (ctx.canvas.className === 'canvas') {
    indexDrawImage(Math.floor(point.x), Math.floor(point.y), brush);
  } */

  if (!overmind.state.toolbox.symmetryModeOn) {
    return;
  }

  // handle symmetry

  const originOfSymmetry: Point = {
    x: Math.round(ctx.canvas.width / 2),
    y: Math.round(ctx.canvas.height / 2),
  };

  // mirror x and y
  const sym1 = {
    x: Math.floor(originOfSymmetry.x + originOfSymmetry.x - point.x),
    y: Math.floor(originOfSymmetry.y + originOfSymmetry.y - point.y),
  };

  // mirror x
  const sym2 = {
    x: Math.floor(originOfSymmetry.x + originOfSymmetry.x - point.x),
    y: Math.floor(point.y),
  };

  // mirror y
  const sym3 = {
    x: Math.floor(point.x),
    y: Math.floor(originOfSymmetry.y + originOfSymmetry.y - point.y),
  };

  // draw and index (symmetry)

  ctx.drawImage(brush.brushImage, sym1.x, sym1.y);
  ctx.drawImage(brush.brushImage, sym2.x, sym2.y);
  ctx.drawImage(brush.brushImage, sym3.x, sym3.y);
  /*   if (ctx.canvas.className === 'canvas') {
    indexDrawImage(sym1.x, sym1.y, brush);
    indexDrawImage(sym2.x, sym2.y, brush);
    indexDrawImage(sym3.x, sym3.y, brush);
  } */
}
