import { Tool } from './Tool';
import { getMousePos, isRightMouseButton, isLeftOrRightMouseButton } from './util/util';
import { overmind } from '../index';
import { brushHistory } from '../brush/BrushHistory';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';

export class AirbrushTool implements Tool {
  // TODO fix
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timeout: any = 0;

  private prepareToPaint(withBGColor: boolean): void {
    if (withBGColor) {
      overmind.actions.tool.activeToolToBGFillStyle();
      overmind.actions.brush.toBGBrush();
    }
  }

  public onInit(): void {
    overmind.actions.tool.activeToolToFGFillStyle();
    overmind.actions.brush.toFGBrush();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseMove(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    overmind.actions.tool.airbrushToolPosition(mousePos);
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const draw = (): void => {
      //TODO: draw in bigger batches, maybe drawDot should accept an array? Or new method
      // drawDots
      for (let i = 50; i--; ) {
        const angle = getRandomFloat(0, Math.PI * 2);
        const radius = getRandomFloat(0, 20);
        if (overmind.state.tool.airbrushTool.position) {
          brushHistory.current.drawPoint(
            {
              x: overmind.state.tool.airbrushTool.position.x + radius * Math.cos(angle),
              y: overmind.state.tool.airbrushTool.position.y + radius * Math.sin(angle),
            },
            paintingCanvasController
          );
        }
      }
      this.timeout = setTimeout(draw, 20);
    };

    this.prepareToPaint(isRightMouseButton(event));
    this.timeout = setTimeout(draw, 20);
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    clearTimeout(this.timeout);
    this.onInit();
    overmind.actions.undo.setUndoPoint();
  }

  public onMouseLeave(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    clearTimeout(this.timeout);
    this.onInit();
    if (isLeftOrRightMouseButton(event)) {
      overmind.actions.undo.setUndoPoint();
    }
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (event.buttons) {
      return;
    }
    const mousePos = getMousePos(event);
    brushHistory.current.drawPoint(mousePos, overlayCanvasController);
  }

  public onMouseDownOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}

function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
