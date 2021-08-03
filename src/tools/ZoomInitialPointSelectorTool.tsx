import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class ZoomInitialPointSelectorTool implements Tool {
  public onInit(): void {
    //selection.prepare(canvas);
  }

  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    overmind.actions.canvas.setZoomFocusPoint(mousePos);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const start = { x: mousePos.x - 30, y: mousePos.y - 30 };
    const end = { x: mousePos.x + 30, y: mousePos.y + 30 };
    overlayCanvasController.selectionBox(start, end);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onClickOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
