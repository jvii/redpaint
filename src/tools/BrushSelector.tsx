import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class BrushSelector implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, setSelectionComplete, toolStateDispatch, state } = params;

    if (toolState.brushSelectorState.startingPosition) {
      const position = getMousePos(canvas, event);

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

      const transCode =
        state.palette.backgroundColor.r * 0x00000001 +
        state.palette.backgroundColor.g * 0x00000100 +
        state.palette.backgroundColor.b * 0x00010000 +
        255 * 0x01000000;

      // from https://stackoverflow.com/questions/11472273/how-to-edit-pixels-and-remove-white-background-in-a-canvas-image-in-html5-and-ja
      let theImageData = bufferCanvasCtx.getImageData(0, 0, width, height),
        theImageDataBufferTMP = new ArrayBuffer(theImageData.data.length),
        theImageDataClamped8TMP = new Uint8ClampedArray(theImageDataBufferTMP),
        theImageDataUint32TMP = new Uint32Array(theImageDataBufferTMP),
        n = theImageDataUint32TMP.length;
      theImageDataClamped8TMP.set(theImageData.data);

      imgDataLoop: while (n--) {
        // effciency at its finest:
        if (theImageDataUint32TMP[n] !== transCode) continue imgDataLoop;
        theImageDataUint32TMP[n] = 0x00000000; // make it transparent
      }
      theImageData.data.set(theImageDataClamped8TMP);
      bufferCanvasCtx.putImageData(theImageData, 0, 0);
      toolStateDispatch({ type: 'brushSelectionComplete', dataURL: bufferCanvas.toDataURL() });
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

  public onMouseUpOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
