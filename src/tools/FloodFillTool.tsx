import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { floodFill } from '../algorithm/floodfill';

export class FloodFillTool implements Tool {
  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const canvasColorIndex = paintingCanvasController.getIndex();
    if (!canvasColorIndex) {
      return;
    }

    const fillColorIndex = Number(overmind.state.palette.foregroundColorId);
    const pointsToFill = floodFill(fillColorIndex, mousePos, canvasColorIndex);
    paintingCanvasController.points(pointsToFill, fillColorIndex);
    overmind.actions.undo.setUndoPoint();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();

    const mousePos = getMousePos(event);
    const canvasColorIndex = paintingCanvasController.getIndex();
    if (!canvasColorIndex) {
      return;
    }

    const fillColorIndex = Number(overmind.state.palette.backgroundColorId);
    const pointsToFill = floodFill(fillColorIndex, mousePos, canvasColorIndex);
    paintingCanvasController.points(pointsToFill, fillColorIndex);
    overmind.actions.undo.setUndoPoint();
  }
}
