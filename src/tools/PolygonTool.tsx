import { Tool } from './Tool';
import { getMousePos, isRightMouseButton, pointEquals } from './util/util';
import { overmind } from '../index';
import { PixelBrush } from '../brush/PixelBrush';
import { symmetryBrush, SymmetryBrush } from '../brush/SymmetryBrush';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { drawSymmetryIndicator } from './util/symmetryIndicator';

// The polygon outline preview always uses a pixel outline (not the current
// custom brush), wrapped so it is mirrored under symmetry.
const pixelSymmetryBrush = new SymmetryBrush((): PixelBrush => new PixelBrush());

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
    const mousePos = getMousePos(event);

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
        symmetryBrush.drawFilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          paintingCanvasController
        );
      } else {
        symmetryBrush.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          true,
          paintingCanvasController
        );
      }
      overmind.actions.undo.setUndoPoint();
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
        pixelSymmetryBrush.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      } else {
        symmetryBrush.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      }
    }
  }

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    if (!overmind.state.tool.polygonTool.vertices.length) {
      overlayCanvasController.clear();
      if (this.filled) {
        // DPaint only draws unfilled shapes with the current brush; for
        // filled shapes the brush is not drawn (see CircleTool et al.), so
        // show a foreground-color point at each symmetry position instead.
        drawSymmetryIndicator(mousePos);
      } else {
        symmetryBrush.drawPoints([mousePos], overlayCanvasController);
      }
      return;
    }

    if (this.filled) {
      pixelSymmetryBrush.drawUnfilledPolygon(
        overmind.state.tool.polygonTool.vertices.slice().concat(mousePos),
        false,
        overlayCanvasController
      );
    } else {
      overlayCanvasController.clear();
      symmetryBrush.drawUnfilledPolygon(
        overmind.state.tool.polygonTool.vertices.slice().concat(mousePos),
        false,
        overlayCanvasController
      );
      symmetryBrush.drawPointerCopies(mousePos, overlayCanvasController);
    }
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();

    if (overmind.state.tool.polygonTool.vertices.length > 0) {
      if (this.filled) {
        pixelSymmetryBrush.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      } else {
        symmetryBrush.drawUnfilledPolygon(
          overmind.state.tool.polygonTool.vertices,
          false,
          overlayCanvasController
        );
      }
    }
  }
}
