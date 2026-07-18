import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushHistory } from '../brush/BrushHistory';
import { CustomBrush } from '../brush/CustomBrush';

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

    // normalize to a top-left anchor with inclusive dimensions: the selection
    // covers both corner pixels regardless of drag direction
    const topLeft = {
      x: Math.min(start.x, mousePos.x),
      y: Math.min(start.y, mousePos.y),
    };
    const width = Math.abs(mousePos.x - start.x) + 1;
    const height = Math.abs(mousePos.y - start.y) + 1;

    const customBrush = CustomBrush.fromCanvasArea(topLeft, width, height);
    brushHistory.setCustom(customBrush);
    overmind.actions.brush.clearBuiltInBrushSelection();
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
