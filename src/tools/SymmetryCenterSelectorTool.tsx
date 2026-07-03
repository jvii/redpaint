import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

// Selector tool for picking the symmetry center point (DPaint's IMSymCent
// mode): a crosshair follows the cursor, left click sets the center and exits
// back to the previous tool, right click exits without changing anything.
export class SymmetryCenterSelectorTool implements Tool {
  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    overmind.actions.symmetry.setCenter(mousePos);
    overmind.actions.toolbox.toggleSymmetryCenterSelectionMode();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
    overmind.actions.toolbox.toggleSymmetryCenterSelectionMode();
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    overlayCanvasController.selectionCrosshair(mousePos);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onClickOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
