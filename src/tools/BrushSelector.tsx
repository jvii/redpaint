import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import { getMousePos, clearOverlayCanvas, extractBrush } from './util/util';
import { overmind } from '../index';
import { selection } from './util/SelectionIndicator';

export class BrushSelector implements Tool {
  public onInit(params: EventHandlerParams): void {
    const {
      ctx: { canvas },
    } = params;
    overmind.actions.tool.brushSelectionStart(null);
    selection.prepare(canvas);
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
    // switch to Dotted Freehand tool after selection
    overmind.actions.toolbox.setSelectedDrawingTool('dottedFreehand');
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
      selection.edgeToEdgeCrosshair(ctx, mousePos);
      onPaint();
      return;
    }

    selection.box(ctx, start, mousePos);
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
