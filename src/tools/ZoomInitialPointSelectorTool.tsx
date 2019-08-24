import { Tool, EventHandlerParams } from './Tool';
import { getMousePos } from './util';

export class ZoomInitialPointSelectorTool implements Tool {
  public onClick(params: EventHandlerParams): void {
    const { event, canvas, toolStateDispatch } = params;
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'zoomInitialPoint', point: position });
  }

  public onContextMenu(params: EventHandlerParams): void {
    const { event } = params;
    event.preventDefault();
  }
}
