import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';

export class ColorSelectorTool implements Tool {
  public constructor(foregroundColor: boolean) {
    this.foregroundColor = foregroundColor;
  }
  private foregroundColor: boolean;

  public onClick(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      ctx,
      ctx: { canvas },
    } = params;
    const mousePos = getMousePos(canvas, event);
    const canvasColor = ctx.getImageData(mousePos.x, mousePos.y, 1, 1).data;
    const color = { r: canvasColor[0], g: canvasColor[1], b: canvasColor[2] };
    if (this.foregroundColor) {
      overmind.actions.palette.findAndSetForegroundColor(color);
      overmind.actions.toolbox.toggleForegroundColorSelectionMode();
    } else {
      overmind.actions.palette.findAndSetBackgroundColor(color);
      overmind.actions.toolbox.toggleBackgroundColorSelectionMode();
    }
  }

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  // No overlay
}
