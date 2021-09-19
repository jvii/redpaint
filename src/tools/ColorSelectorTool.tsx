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
    const colorNumber = paintingCanvasController.getColorNumberForPoint(mousePos);
    if (!colorNumber) {
      return;
    }
    if (this.foregroundColor) {
      overmind.actions.palette.setForegroundColor(colorNumber.toString());
      overmind.actions.toolbox.toggleForegroundColorSelectionMode();
    } else {
      overmind.actions.palette.setBackgroundColor(colorNumber.toString());
      overmind.actions.toolbox.toggleBackgroundColorSelectionMode();
    }
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  // No overlay
}
