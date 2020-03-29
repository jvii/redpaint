import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
  EventHandlerParamsOverlay,
} from './Tool';
import { getMousePos, clearOverlayCanvas, omit } from './util/util';
import { selection } from './util/SelectionIndicator';
import { overmind } from '../index';

export class TextTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }
  private filled: boolean;

  public onInit(params: EventHandlerParams): void {
    const {
      ctx: { canvas },
    } = params;
    selection.prepare(canvas);
    overmind.actions.tool.textToolReset();
    overmind.actions.tool.activeToolToFGFillStyle();
  }

  public onExit(params: EventHandlerParams): void {
    const { ctx, undoPoint, onPaint } = params;
    const start = overmind.state.tool.textTool.start;
    const text = overmind.state.tool.textTool.text;
    if (start && text !== '') {
      this.renderText(ctx);
      undoPoint();
      onPaint();
    }
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onClick(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      undoPoint,
      onPaint,
    } = params;

    const mousePos = getMousePos(canvas, event);

    const start = overmind.state.tool.textTool.start;
    const text = overmind.state.tool.textTool.text;
    if (start && text !== '') {
      this.renderText(ctx);
      undoPoint();
      this.onInit(omit(params, 'event'));
      onPaint();
    }
    overmind.actions.tool.textToolStart(mousePos);
  }

  // Overlay

  public onInitOverlay(params: EventHandlerParamsOverlay): void {
    const {
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    window.onkeydown = (event: KeyboardEvent): void => {
      overmind.actions.tool.textToolKey(event.key);
      clearOverlayCanvas(canvas);
      this.renderText(ctx);
      selection.textCursor(ctx, 50);
      onPaint();
    };
    clearOverlayCanvas(canvas);
  }

  public onExitOverlay(params: EventHandlerParamsOverlay): void {
    const {
      ctx: { canvas },
    } = params;
    clearOverlayCanvas(canvas);
  }

  public onClickOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    selection.textCursor(ctx, 50);
    onPaint();
  }

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
    } = params;
    const start = overmind.state.tool.textTool.start;
    if (!start) {
      clearOverlayCanvas(canvas);
      const mousePos = getMousePos(canvas, event);
      selection.box(ctx, mousePos, { x: mousePos.x + 20, y: mousePos.y - 50 });
    }
  }

  public onMouseEnterOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    this.renderText(ctx);
    selection.textCursor(ctx, 50);
    onPaint();
  }

  private renderText(ctx: CanvasRenderingContext2D): void {
    ctx.font = '50px Georgia';
    const start = overmind.state.tool.textTool.start;
    if (!start) {
      return;
    }
    const text = overmind.state.tool.textTool.text;
    if (this.filled) {
      ctx.fillText(text, start.x, start.y);
    } else {
      ctx.strokeText(text, start.x, start.y);
    }
  }
}
