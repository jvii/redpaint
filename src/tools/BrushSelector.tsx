import { Tool } from './Tool';
import { getMousePos, extractBrush } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushHistory } from '../brush/BrushHistory';

export class BrushSelector implements Tool {
  public onInit(): void {
    overmind.actions.tool.brushSelectionStart(null);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      return;
    }

    const mousePos = getMousePos(event);
    const width = mousePos.x - start.x;
    const height = mousePos.y - start.y;

    const brush = extractBrush(event.currentTarget, start, width, height);
    brushHistory.set(brush);
    overmind.actions.brush.setMode('Matte');

    // exit brush selection tool
    overmind.actions.toolbox.toggleBrushSelectionMode();
    // switch to Dotted Freehand tool after selection
    overmind.actions.toolbox.setSelectedDrawingTool('dottedFreehand');
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    overmind.actions.tool.brushSelectionStart(mousePos);
  }

  public onMouseLeave(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overmind.actions.tool.brushSelectionStart(null);
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      overlayCanvasController.selectionCrosshair(mousePos);
      return;
    }
    overlayCanvasController.selectionBox(start, mousePos);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseUpOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
