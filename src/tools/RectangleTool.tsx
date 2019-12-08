import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { Color } from '../types';
import { getMousePos, clearOverlayCanvas, colorToRGBString } from './util';

export class RectangleTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }

  private filled: boolean;

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      canvas,
      state,
      onDrawToCanvas,
      toolState,
      toolStateDispatch,
      undoPoint,
    } = params;

    if (toolState.rectangleToolState.startingPosition) {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const position = getMousePos(canvas, event);
      const width = position.x - toolState.rectangleToolState.startingPosition.x;
      const height = position.y - toolState.rectangleToolState.startingPosition.y;

      if (this.filled) {
        ctx.fillStyle = colorToRGBString(chooseColor(event, state.palette));
        ctx.fillRect(
          toolState.rectangleToolState.startingPosition.x,
          toolState.rectangleToolState.startingPosition.y,
          width,
          height
        );
      } else {
        ctx.strokeStyle = colorToRGBString(chooseColor(event, state.palette));
        ctx.lineWidth = 1;
        ctx.strokeRect(
          toolState.rectangleToolState.startingPosition.x,
          toolState.rectangleToolState.startingPosition.y,
          width,
          height
        );
      }

      undoPoint();
      onDrawToCanvas();
      toolStateDispatch({ type: 'rectangleToolStart', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'rectangleToolStart', point: position });
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'rectangleToolStart', point: null });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, state, toolState, onDrawToCanvas } = params;
    const position = getMousePos(canvas, event);

    if (toolState.rectangleToolState.startingPosition) {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      clearOverlayCanvas(canvas);
      const width = position.x - toolState.rectangleToolState.startingPosition.x;
      const height = position.y - toolState.rectangleToolState.startingPosition.y;
      if (this.filled) {
        ctx.fillStyle = colorToRGBString(chooseColor(event, state.palette));
        ctx.fillRect(
          toolState.rectangleToolState.startingPosition.x,
          toolState.rectangleToolState.startingPosition.y,
          width,
          height
        );
      } else {
        ctx.strokeStyle = colorToRGBString(chooseColor(event, state.palette));
        ctx.strokeRect(
          toolState.rectangleToolState.startingPosition.x,
          toolState.rectangleToolState.startingPosition.y,
          width,
          height
        );
      }
    }
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }

  public onMouseUpOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}

// Helpers

function chooseColor(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  paletteState: { foregroundColor: Color; backgroundColor: Color }
): Color {
  if (event.button === 0) {
    return paletteState.foregroundColor;
  }
  if (event.button === 2) {
    return paletteState.backgroundColor;
  }
  return paletteState.foregroundColor;
}
