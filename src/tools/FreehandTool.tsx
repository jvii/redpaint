import { Tool } from './Tool';
import { PointerState } from '../types';

export class FreehandTool implements Tool {
  public use(pointerState: PointerState, canvas: HTMLCanvasElement): void {
    if (!pointerState.isMouseDown) {
      return;
    }
    if (!pointerState.previousPosition) {
      return;
    }
    if (!pointerState.currentPosition) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pointerState.previousPosition.x, pointerState.previousPosition.y);
    ctx.lineTo(pointerState.currentPosition.x, pointerState.currentPosition.y);
    ctx.stroke();
  }
}
