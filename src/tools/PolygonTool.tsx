import { Tool } from './Tool';
import { getMousePos, isRightMouseButton, pointEquals } from './util/util';
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

  public onInit(): void {
    overmind.actions.tool.polygonToolReset();
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event.currentTarget, event);

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
      //undoPoint();
      this.onInit();
      return;
    }

    // otherwise just add new vertice
    overmind.actions.tool.polygonToolAddVertice(mousePos);
  }

  // Overlay

  public onMouseDownOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
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
  }

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event.currentTarget, event);

    if (!overmind.state.tool.polygonTool.vertices.length) {
      overlayCanvasController.clear();
      brushHistory.current.drawPoint(mousePos, overlayCanvasController);
      return;
    }

    if (this.filled) {
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
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
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
    }
  }
}
