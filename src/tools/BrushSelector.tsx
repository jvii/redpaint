import { Tool, EventHandlerParamsWithEvent, OverlayEventHandlerParamsWithEvent } from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  edgeToEdgeCrosshair,
  extractBrush,
  selectionBox,
} from './util';
import { overmind } from '../index';

export class BrushSelector implements Tool {
  public onInit(canvas: HTMLCanvasElement): void {
    overmind.actions.tool.brushSelectionStart(null);
    overmind.actions.canvas.storeInvertedCanvas(canvas);
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;

    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      return;
    }

    const mousePos = getMousePos(canvas, event);
    const width = mousePos.x - start.x;
    const height = mousePos.y - start.y;

    const brush = extractBrush(canvas, start, width, height);
    overmind.actions.brush.setBrush(brush);
    overmind.actions.brush.setMode('Matte');

    // exit brush selection tool
    overmind.actions.toolbox.toggleBrushSelectionMode();
    // switch to Freehand tool after selection for simplicity (what does DPaint do?)
    overmind.actions.toolbox.setSelectedDrawingTool('freeHand');
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, ctx } = params;
    const mousePos = getMousePos(ctx.canvas, event);
    overmind.actions.tool.brushSelectionStart(mousePos);
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.brushSelectionStart(null);
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);

    const mousePos = getMousePos(canvas, event);

    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      edgeToEdgeCrosshair(ctx, mousePos);
      onPaint();
      return;
    }

    selectionBox(ctx, start, mousePos);
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }

  public onMouseUpOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
