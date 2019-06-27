import { Tool } from './Tool';
import { PointerState, Color } from '../types';
import { drawLine } from './util';

export class FreehandTool implements Tool {
  public use(color: Color, pointerState: PointerState, canvas: HTMLCanvasElement): void {
    if (!pointerState.isMouseDown) {
      return;
    }
    if (!pointerState.previousPosition) {
      return;
    }
    if (!pointerState.currentPosition) {
      return;
    }

    drawLine(canvas, color, pointerState.previousPosition, pointerState.currentPosition);
  }
}
