import { PointerState, ToolState } from '../types';

export class LineTool {
  public use(
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    toolState: ToolState,
    setToolState: React.Dispatch<React.SetStateAction<ToolState>>
  ): void {
    if (!pointerState.currentPosition) {
      return;
    }
    if (pointerState.isMouseDown && !toolState.lineToolState.startingPosition) {
      const updatedToolState = toolState;
      updatedToolState.lineToolState.startingPosition =
        pointerState.currentPosition;
      setToolState(updatedToolState);

      return;
    }
    if (!toolState.lineToolState.startingPosition) {
      return;
    }
    if (!pointerState.isMouseDown && toolState.lineToolState.startingPosition) {
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(
        toolState.lineToolState.startingPosition.x,
        toolState.lineToolState.startingPosition.y
      );
      ctx.lineTo(
        pointerState.currentPosition.x,
        pointerState.currentPosition.y
      );
      ctx.stroke();

      const updatedToolState = toolState;
      updatedToolState.lineToolState.startingPosition = null;
      setToolState(updatedToolState);
    }
  }
}
