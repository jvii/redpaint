import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, edgeToEdgeCrosshair } from './util';
import { CustomBrush } from '../brush/CustomBrush';
import { overmind } from '../index';

export class BrushSelector implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;

    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      return;
    }

    const position = getMousePos(canvas, event);
    const width = position.x - start.x;
    const height = position.y - start.y;

    let bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = Math.abs(width);
    bufferCanvas.height = Math.abs(height);

    const bufferCanvasCtx = bufferCanvas.getContext('2d');
    if (!bufferCanvasCtx) {
      return;
    }
    bufferCanvasCtx.drawImage(
      canvas,
      start.x,
      start.y,
      width,
      height,
      0,
      0,
      bufferCanvas.width,
      bufferCanvas.height
    );

    const transCode =
      overmind.state.palette.backgroundColor.r * 0x00000001 +
      overmind.state.palette.backgroundColor.g * 0x00000100 +
      overmind.state.palette.backgroundColor.b * 0x00010000 +
      255 * 0x01000000;

    // from https://stackoverflow.com/questions/11472273/how-to-edit-pixels-and-remove-white-background-in-a-canvas-image-in-html5-and-ja
    let theImageData = bufferCanvasCtx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height),
      theImageDataBufferTMP = new ArrayBuffer(theImageData.data.length),
      theImageDataClamped8TMP = new Uint8ClampedArray(theImageDataBufferTMP),
      theImageDataUint32TMP = new Uint32Array(theImageDataBufferTMP),
      n = theImageDataUint32TMP.length;
    theImageDataClamped8TMP.set(theImageData.data);

    imgDataLoop: while (n--) {
      if (theImageDataUint32TMP[n] !== transCode) continue imgDataLoop;
      theImageDataUint32TMP[n] = 0x00000000; // make it transparent
    }
    theImageData.data.set(theImageDataClamped8TMP);
    bufferCanvasCtx.putImageData(theImageData, 0, 0);
    //toolStateDispatch({ type: 'brushSelectionComplete', dataURL: bufferCanvas.toDataURL() });

    const brush = new CustomBrush(bufferCanvas.toDataURL());
    overmind.actions.brush.setBrush(brush);
    overmind.actions.toolbar.toggleBrushSelectionMode();
    // switch to Freehand tool after selection for simplicity (what does DPaint do?)
    overmind.actions.toolbar.setSelectedDrawingTool('freeHand');
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const mousePos = getMousePos(canvas, event);
    //toolStateDispatch({ type: 'brushSelectionStart', point: position });
    overmind.actions.tool.brushSelectionStart(mousePos);
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.brushSelectionStart(null);
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);

    const start = overmind.state.tool.brushSelectorTool.start;
    const mousePos = getMousePos(canvas, event);
    if (!start) {
      edgeToEdgeCrosshair(canvas, mousePos);
      onDrawToCanvas();
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const width = mousePos.x - start.x;
    const height = mousePos.y - start.y;
    ctx.strokeRect(start.x, start.y, width, height);
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
