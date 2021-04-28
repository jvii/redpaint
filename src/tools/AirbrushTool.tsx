import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  isRightMouseButton,
  isLeftOrRightMouseButton,
  omit,
} from './util/util';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class AirbrushTool implements Tool {
  private timeout = 0;

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;

    const mousePos = getMousePos(canvas, event);
    overmind.actions.tool.airbrushToolPosition(mousePos);
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, ctx, onPaint } = params;

    // eslint-disable-next-line @typescript-eslint/ban-types
    const draw = (ctx: CanvasRenderingContext2D, onPaint: Function): void => {
      //TODO: draw in bigger batches, maybe drawDot should accept an array? Or new method
      // drawDots
      for (let i = 50; i--; ) {
        const angle = getRandomFloat(0, Math.PI * 2);
        const radius = getRandomFloat(0, 20);
        if (overmind.state.tool.airbrushTool.position) {
          brushHistory.current.drawPoint(
            ctx,
            {
              x: overmind.state.tool.airbrushTool.position.x + radius * Math.cos(angle),
              y: overmind.state.tool.airbrushTool.position.y + radius * Math.sin(angle),
            },
            paintingCanvasController
          );
        }
      }
      onPaint();
      this.timeout = setTimeout(draw, 20, ctx, onPaint);
    };

    this.prepareToPaint(isRightMouseButton(event));
    this.timeout = setTimeout(draw, 20, ctx, onPaint);
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { undoPoint } = params;
    clearTimeout(this.timeout);
    this.onInit(omit(params, 'event'));
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { event, undoPoint } = params;
    clearTimeout(this.timeout);
    this.onInit(omit(params, 'event'));
    if (isLeftOrRightMouseButton(event)) {
      undoPoint();
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
      onPaint,
    } = params;
    if (event.buttons) {
      return;
    }
    clearOverlayCanvas(canvas);

    const mousePos = getMousePos(canvas, event);
    brushHistory.current.drawPoint(ctx, mousePos, overlayCanvasController);
    onPaint();
  }

  public onMouseDownOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    overlayCanvasController.clear();
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);
    overlayCanvasController.clear();
    onPaint();
  }
}

function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
