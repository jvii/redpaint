import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';

export class ColorSelectorTool implements Tool {
  public constructor(foregroundColor: boolean) {
    this.foregroundColor = foregroundColor;
  }
  private foregroundColor: boolean;

  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    //const colorIndex = paintingCanvasController.colorIndexer?.getColorIndexForPixel(mousePos);
    const colorIndex = 1;
    if (!colorIndex) {
      return;
    }
    if (this.foregroundColor) {
      overmind.actions.palette.setForegroundColor(colorIndex.toString());
      overmind.actions.toolbox.toggleForegroundColorSelectionMode();
    } else {
      overmind.actions.palette.setBackgroundColor(colorIndex.toString());
      overmind.actions.toolbox.toggleBackgroundColorSelectionMode();
    }
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  // No overlay
}
