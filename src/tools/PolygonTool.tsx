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
  pointEquals,
  omit,
} from './util/util';
import { overmind } from '../index';
import { PixelBrush } from '../brush/PixelBrush';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class PolygonTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }
  private filled: boolean;

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(params: EventHandlerParams): void {
    overmind.actions.tool.polygonToolReset();
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
      undoPoint,
      onPaint,
    } = params;
    const mousePos = getMousePos(canvas, event);

    // first click (left or right) determines polygon fill color
    if (!overmind.state.tool.polygonTool.vertices.length) {
      this.prepareToPaint(isRightMouseButton(event));
      overmind.actions.tool.polygonToolAddVertice(mousePos);
      return;
    }

    // complete polygon on right click or if starting point reselected
    if (
      isRightMouseButton(event) ||
      pointEquals(overmind.state.tool.polygonTool.vertices[0], mousePos)
    ) {
      if (this.filled) {
        brushHistory.current.drawFilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          paintingCanvasController
        );
      } else {
        brushHistory.current.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          true,
          paintingCanvasController
        );
      }
      undoPoint();
      onPaint();
      this.onInit(omit(params, 'event'));
      return;
    }

    // otherwise just add new vertice
    overmind.actions.tool.polygonToolAddVertice(mousePos);
  }

  // Overlay

  public onMouseDownOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
      onPaint,
    } = params;
    clearOverlayCanvas(canvas);

    if (overmind.state.tool.polygonTool.vertices.length > 1) {
      if (this.filled) {
        new PixelBrush().drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      } else {
        brushHistory.current.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      }
    }
    onPaint();
  }

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
      onPaint,
    } = params;

    const mousePos = getMousePos(canvas, event);

    if (!overmind.state.tool.polygonTool.vertices.length) {
      overlayCanvasController.clear();
      brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      onPaint();
      return;
    }

    if (this.filled) {
      //clearOverlayCanvas(canvas);
      new PixelBrush().drawUnfilledPolygon(
        overmind.state.tool.polygonTool.vertices.slice().concat(mousePos),
        false,
        overlayCanvasController
      );
    } else {
      overlayCanvasController.clear();
      brushHistory.current.drawUnfilledPolygon(
        overmind.state.tool.polygonTool.vertices.slice().concat(mousePos),
        false,
        overlayCanvasController
      );
    }
    onPaint();
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const { onPaint } = params;

    overlayCanvasController.clear();

    if (overmind.state.tool.polygonTool.vertices.length > 0) {
      if (this.filled) {
        new PixelBrush().drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      } else {
        brushHistory.current.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      }
      onPaint();
    }
  }
}
