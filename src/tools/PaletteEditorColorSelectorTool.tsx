import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';

// Choosing the color to edit by pointing at it in the picture, as DPaint's
// palette requester does. It goes through the same action the requester's own
// swatches do, so an armed Copy/Swap/Spread/Range completes against the picked
// color too.
export class PaletteEditorColorSelectorTool implements Tool {
  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const paintColor = paintingCanvasController.getPaintColorForPoint(mousePos);
    // A true-color pixel belongs to no palette slot, so there is nothing to edit.
    if (!paintColor || paintColor.kind === 'rgb') {
      return;
    }
    overmind.actions.paletteEditor.selectEditedColor(paintColor.colorNumber.toString());
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  // No overlay
}
