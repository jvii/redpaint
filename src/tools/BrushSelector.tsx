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
    overmind.actions.tool.brushSelectionStart(null);
    //selection.prepare(canvas);
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { event } = params;

    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      return;
    }

    const mousePos = getMousePos(event.currentTarget, event);
    const width = mousePos.x - start.x;
    const height = mousePos.y - start.y;

    const brush = extractBrush(event.currentTarget, start, width, height);
    overmind.actions.brush.setBrush(brush);
    overmind.actions.brush.setMode('Matte');

    // exit brush selection tool
    overmind.actions.toolbox.toggleBrushSelectionMode();
    // switch to Dotted Freehand tool after selection
    overmind.actions.toolbox.setSelectedDrawingTool('dottedFreehand');
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    const mousePos = getMousePos(event.currentTarget, event);
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
    } = params;
    clearOverlayCanvas(canvas);

    const mousePos = getMousePos(canvas, event);

    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      selection.edgeToEdgeCrosshair(ctx, mousePos);
      return;
    }

    selection.box(ctx, start, mousePos);
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
    } = params;
    clearOverlayCanvas(canvas);
  }

  public onMouseUpOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
    } = params;
    clearOverlayCanvas(canvas);
  }
}
