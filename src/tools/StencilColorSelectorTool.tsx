import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';

// Picking the stencil's colors off the picture while the requester is open, as
// DPaint does (docs/stencil.md). Same toggle as clicking the requester's own
// swatch: a color already locked comes off.
export class StencilColorSelectorTool implements Tool {
  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const paintColor = paintingCanvasController.getPaintColorForPoint(mousePos);
    // A true-color pixel holds no color number, so there is nothing to lock:
    // the stencil is built from the palette.
    if (!paintColor || paintColor.kind === 'rgb') {
      return;
    }
    overmind.actions.stencil.toggleColor(paintColor.colorNumber);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  // No overlay
}
