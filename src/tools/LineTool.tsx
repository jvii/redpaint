import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { PaletteState } from '../components/palette/PaletteState';
import { Color } from '../types';
import { drawLineNoAliasing, getMousePos, clearOverlayCanvas, drawDot } from './util';

export class LineTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, paletteState, onDrawToCanvas, toolState, toolStateDispatch } = params;
    console.log('onMouseUp LineTool ' + event.button);
    if (!canvas) {
      return;
    }
    if (toolState.lineToolState.startingPosition) {
      const position = getMousePos(canvas, event);
      drawLineNoAliasing(
        canvas,
        chooseColor(event, paletteState),
        toolState.lineToolState.startingPosition,
        position
      );
      onDrawToCanvas();
      toolStateDispatch({ type: 'lineToolStart', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    console.log('onMouseDown LineTool');
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'lineToolStart', point: position });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, paletteState } = params;
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);

    clearOverlayCanvas(canvas);
    if (toolState.lineToolState.startingPosition) {
      drawLineNoAliasing(
        canvas,
        paletteState.foregroundColor,
        toolState.lineToolState.startingPosition,
        position
      );
    } else {
      drawDot(canvas, paletteState.foregroundColor, position);
    }
  }
}

// Helpers

function chooseColor(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  paletteState: PaletteState
): Color {
  if (event.button === 0) {
    return paletteState.foregroundColor;
  }
  if (event.button === 2) {
    return paletteState.backgroundColor;
  }
  return paletteState.foregroundColor;
}
