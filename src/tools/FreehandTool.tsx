import { Tool } from './Tool';
import { PointerState } from '../types';
import { drawLine } from './util';

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
    drawLine(canvas, pointerState.previousPosition, pointerState.currentPosition);
  }
}
