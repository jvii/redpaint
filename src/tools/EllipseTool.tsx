import {
  Tool,
  EventHandlerParamsWithEvent,
  OverlayEventHandlerParamsWithEvent,
  EventHandlerParams,
} from './Tool';
import {
  getMousePos,
  clearOverlayCanvas,
  isLeftMouseButton,
  isRightMouseButton,
  omit,
} from './util/util';
import { overmind } from '../index';
import { selection } from './util/SelectionIndicator';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class EllipseTool implements Tool {
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
    const {
      ctx: { canvas },
    } = params;
    selection.prepare(canvas);
    overmind.actions.tool.ellipseToolReset();
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

    // Do nothing if center point not set, or radius not yet set

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      return;
    }
    if (!overmind.state.tool.ellipseTool.radiusX || !overmind.state.tool.ellipseTool.radiusY) {
      return;
    }

    // Change rotation angle if left mouse button down, otherwise re-adjust radius

    const mousePos = getMousePos(canvas, event);

    if (isLeftMouseButton(event)) {
      const rotationAngle = mousePos.y - origin.y - overmind.state.tool.ellipseTool.radiusY;
      overmind.actions.tool.ellipseToolAngle(rotationAngle);
    } else {
      const radiusX = Math.abs(mousePos.x - origin.x);
      const radiusY = Math.abs(mousePos.y - origin.y);
      overmind.actions.tool.ellipseToolRadius({ x: radiusX, y: radiusY });
    }
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
      undoPoint,
    } = params;

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      return;
    }

    // If radius has not been set, set it and return

    const radiusX = overmind.state.tool.ellipseTool.radiusX;
    const radiusY = overmind.state.tool.ellipseTool.radiusY;
    if (!radiusX || !radiusY) {
      const mousePos = getMousePos(canvas, event);
      overmind.actions.tool.ellipseToolRadius({
        x: Math.abs(mousePos.x - origin.x),
        y: Math.abs(mousePos.y - origin.y),
      });
      return;
    }

    // Draw ellipse

    const angle = overmind.state.tool.ellipseTool.angle;
    if (this.filled) {
      brushHistory.current.drawFilledEllipse(
        origin,
        radiusX,
        radiusY,
        angle,
        paintingCanvasController
      );
    } else {
      brushHistory.current.drawUnfilledEllipse(
        origin,
        radiusX,
        radiusY,
        angle,
        paintingCanvasController
      );
    }
    undoPoint();
    this.onInit(omit(params, 'event'));
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx: { canvas },
    } = params;
    const mousePos = getMousePos(canvas, event);
    if (!overmind.state.tool.ellipseTool.origin) {
      overmind.actions.tool.ellipseToolOrigin(mousePos);
      this.prepareToPaint(isRightMouseButton(event));
    }
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    if (!event.buttons) {
      this.onInit(omit(params, 'event'));
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
    } = params;

    const mousePos = getMousePos(canvas, event);

    const origin = overmind.state.tool.ellipseTool.origin;
    if (!origin) {
      clearOverlayCanvas(canvas);
      overlayCanvasController.clear();
      if (!this.filled) {
        // DPaint only draws unfilled shapes with the current brush
        brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      }
      selection.edgeToEdgeCrosshair(ctx, mousePos);
      return;
    }

    const radiusX = overmind.state.tool.ellipseTool.radiusX;
    const radiusY = overmind.state.tool.ellipseTool.radiusY;
    const newRadiusX = Math.abs(mousePos.x - origin.x);
    const newRadiusY = Math.abs(mousePos.y - origin.y);
    const angle = overmind.state.tool.ellipseTool.angle;

    if (this.filled) {
      clearOverlayCanvas(canvas);
      overlayCanvasController.clear();
      brushHistory.current.drawFilledEllipse(
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle,
        overlayCanvasController
      );
    } else {
      clearOverlayCanvas(canvas);
      overlayCanvasController.clear();
      brushHistory.current.drawUnfilledEllipse(
        origin,
        radiusX ? radiusX : newRadiusX,
        radiusY ? radiusY : newRadiusY,
        angle,
        overlayCanvasController
      );
    }
  }

  public onMouseLeaveOverlay(params: OverlayEventHandlerParamsWithEvent): void {
    const {
      ctx: { canvas },
    } = params;
    clearOverlayCanvas(canvas);
    overlayCanvasController.clear();
  }
}
