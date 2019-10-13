import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class BrushSelector implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, setSelectionComplete, toolStateDispatch } = params;

    if (toolState.brushSelectorState.startingPosition) {
      const position = getMousePos(canvas, event);
      //toolStateDispatch({ type: 'lineToolStart', point: null });
      console.log('selected brush');
      const width = position.x - toolState.brushSelectorState.startingPosition.x;
      const height = position.y - toolState.brushSelectorState.startingPosition.y;
      var bufferCanvas = document.createElement('canvas');
      bufferCanvas.width = width;
      bufferCanvas.height = height;
      const bufferCanvasCtx = bufferCanvas.getContext('2d');
      if (!bufferCanvasCtx) {
        return;
      }
      bufferCanvasCtx.drawImage(
        canvas,
        toolState.brushSelectorState.startingPosition.x,
        toolState.brushSelectorState.startingPosition.y,
        width,
        height,
        0,
        0,
        width,
        height
      );
      toolStateDispatch({ type: 'brushSelectionComplete', dataURL: bufferCanvas.toDataURL() });
      toolStateDispatch({ type: 'brushSelectionStart', point: null });
      setSelectionComplete();
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'brushSelectionStart', point: position });
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'brushSelectionStart', point: null });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, onDrawToCanvas } = params;
    const position = getMousePos(canvas, event);

    clearOverlayCanvas(canvas);
    if (toolState.brushSelectorState.startingPosition) {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      clearOverlayCanvas(canvas);
      const width = position.x - toolState.brushSelectorState.startingPosition.x;
      const height = position.y - toolState.brushSelectorState.startingPosition.y;
      ctx.strokeRect(
        toolState.brushSelectorState.startingPosition.x,
        toolState.brushSelectorState.startingPosition.y,
        width,
        height
      );
    }
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
