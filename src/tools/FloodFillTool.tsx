import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { floodFill } from '../algorithm/floodfill';

export class FloodFillTool implements Tool {
  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overmind.actions.app.setLoading(true);
  }

  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const canvasColorIndex = paintingCanvasController.getCanvasColorIndex();
    if (!canvasColorIndex) {
      overmind.actions.app.setLoading(false);
      return;
    }

    const fillColorIndex = Number(overmind.state.palette.foregroundColorId);

    const pointsToFill = floodFill(fillColorIndex, mousePos, canvasColorIndex);
    paintingCanvasController.points(pointsToFill, fillColorIndex);
    overmind.actions.undo.setUndoPoint();
    overmind.actions.app.setLoading(false);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
    const mousePos = getMousePos(event);
    const canvasColorIndex = paintingCanvasController.getCanvasColorIndex();
    if (!canvasColorIndex) {
      overmind.actions.app.setLoading(false);
      return;
    }

    const fillColorIndex = Number(overmind.state.palette.backgroundColorId);

    // This is a hack to ensure the loading state is visible. Something to do with browser rendering timing.
    setTimeout(() => {
      const pointsToFill = floodFill(fillColorIndex, mousePos, canvasColorIndex);
      paintingCanvasController.points(pointsToFill, fillColorIndex);
      overmind.actions.undo.setUndoPoint();
      overmind.actions.app.setLoading(false);
    }, 50);
  }
}
