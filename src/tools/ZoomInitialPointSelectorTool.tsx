import { Tool } from './Tool';
import { getMousePos } from './util';
import { EventHandlerParams } from '../types';

export class ZoomInitialPointSelectorTool implements Tool {
  public onClick(params: EventHandlerParams): void {
    const { event, canvas } = params;
    console.log('onClick ZoomInitialPointSelectorTool');
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    params.dispatch({ type: 'zoomInitialPoint', point: position });
  }

  public onContextMenu(params: EventHandlerParams): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParams): void {
    console.log('onMouseMove LineTool');
  }

  public onMouseUp(params: EventHandlerParams): void {
    console.log('onMouseUp LineTool');
  }

  public onMouseDown(params: EventHandlerParams): void {
    console.log('onMouseDown LineTool');
  }

  public onMouseLeave(params: EventHandlerParams): void {
    console.log('onMouseLeave LineTool');
  }

  public onMouseEnter(params: EventHandlerParams): void {
    console.log('onMouseEnter LineTool');
  }
}
