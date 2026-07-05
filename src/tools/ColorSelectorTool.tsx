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
    const paintColor = paintingCanvasController.getPaintColorForPoint(mousePos);
    if (!paintColor) {
      return;
    }
    if (this.foregroundColor) {
      // picking a true-color pixel sets a literal RGB foreground
      if (paintColor.kind === 'rgb') {
        overmind.actions.palette.setForegroundRgb(paintColor.color);
      } else {
        overmind.actions.palette.setForegroundColor(paintColor.colorNumber.toString());
      }
      overmind.actions.toolbox.toggleForegroundColorSelectionMode();
    } else {
      // the background stays palette-indexed (it doubles as the clear color
      // and the brush transparency marker), so true-color pixels can't be
      // picked as background
      if (paintColor.kind === 'rgb') {
        return;
      }
      overmind.actions.palette.setBackgroundColor(paintColor.colorNumber.toString());
      overmind.actions.toolbox.toggleBackgroundColorSelectionMode();
    }
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  // No overlay
}
