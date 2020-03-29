import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import { getMousePos, clearOverlayCanvas } from './util/util';
import { overmind } from '../index';
import { selection } from './util/SelectionIndicator';

export class ZoomInitialPointSelectorTool implements Tool {
  public onInit(params: EventHandlerParams): void {
    const {
      ctx: { canvas },
    } = params;
    selection.prepare(canvas);
  }

  public onClick(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    const mousePos = getMousePos(canvas, event);
    overmind.actions.canvas.setZoomFocusPoint(mousePos);
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
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
    const start = { x: mousePos.x - 30, y: mousePos.y - 30 };
    const end = { x: mousePos.x + 30, y: mousePos.y + 30 };
    selection.box(ctx, start, end);
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

  public onClickOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    onPaint();
  }
}
