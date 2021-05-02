import { Point } from '../../types';
import { PixelBrush } from '../../brush/PixelBrush';
import { overmind } from '../../index';

let invertedCanvas: CanvasPattern | null = null;

//TODO: move these to OverlayCanvasController
export const selection = {
  prepare(canvas: HTMLCanvasElement): void {
    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;
    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.filter = 'invert(1)';
    ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 1; // alpha 0 = no effect 1 = full effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pattern = ctx.createPattern(bufferCanvas, 'no-repeat');
    if (pattern) {
      invertedCanvas = pattern;
    }
  },
  edgeToEdgeCrosshair(ctx: CanvasRenderingContext2D, position: Point): void {
    if (invertedCanvas) {
      ctx.fillStyle = invertedCanvas;
    }
    ctx.fillRect(position.x, 0, 1, ctx.canvas.height);
    ctx.fillRect(0, position.y, ctx.canvas.width, 1);
    //ctx.fillStyle = overmind.state.canvas.fillStyle;
  },
  box(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    if (invertedCanvas) {
      ctx.fillStyle = invertedCanvas;
    }
    //unfilledRect(ctx, new PixelBrush(), start, end);
    //ctx.fillStyle = overmind.state.canvas.fillStyle;
  },
  textCursor(ctx: CanvasRenderingContext2D, height: number): void {
    if (invertedCanvas) {
      ctx.fillStyle = invertedCanvas;
    }
    const start = overmind.state.tool.textTool.start;
    if (!start) {
      return;
    }
    const point = {
      x: start.x + Math.round(ctx.measureText(overmind.state.tool.textTool.text).width),
      y: start.y,
    };
    console.log(point);
    //unfilledRect(ctx, new PixelBrush(), point, { x: point.x, y: point.y - height });
    //ctx.fillStyle = overmind.state.canvas.fillStyle;
  },
};
