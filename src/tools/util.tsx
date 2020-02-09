import { Point, Color } from '../types';
import { Tool, EventHandlerParams } from './Tool';
import { overmind } from '../index';

export function colorToRGBString(color: Color): string {
  return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
}

export function getMousePos(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
): Point {
  const rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width, // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y

  return {
    x: Math.floor((event.clientX - rect.left) * scaleX), // scale mouse coordinates after they have
    y: Math.floor((event.clientY - rect.top) * scaleY), // been adjusted to be relative to element
  };
}

export function chooseColor(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  paletteState: { foregroundColor: Color; backgroundColor: Color }
): Color {
  if (event.buttons === 1) {
    return paletteState.foregroundColor;
  }
  if (event.buttons === 2) {
    return paletteState.backgroundColor;
  }
  return paletteState.foregroundColor;
}

export function clearCanvas(canvas: HTMLCanvasElement, color: Color): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colorToRGBString(color);
  ctx.fill();
}

export function clearOverlayCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function getEventHandler(
  tool: Tool,
  eventHandlerName:
    | 'onClick'
    | 'onContextMenu'
    | 'onMouseMove'
    | 'onMouseUp'
    | 'onMouseDown'
    | 'onMouseLeave'
    | 'onMouseEnter'
    | 'onMouseMoveOverlay'
    | 'onMouseLeaveOverlay'
    | 'onMouseEnterOverlay'
    | 'onMouseUpOverlay'
    | 'onMouseDownOverlay'
    | 'onClickOverlay',
  eventHandlerParams: EventHandlerParams
): (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void {
  if (hasKey(tool, eventHandlerName)) {
    return (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
      tool[eventHandlerName]!({ event: event, ...eventHandlerParams });
  }
  return (): void => {};
}

function hasKey<O>(obj: O, key: keyof any): key is keyof O {
  return key in obj;
}

export function isRightMouseButton(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
): boolean {
  return event.button === 2 || event.buttons === 2;
}

export function isLeftMouseButton(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): boolean {
  return event.button === 1 || event.buttons === 1;
}

export function edgeToEdgeCrosshair(canvas: HTMLCanvasElement, position: Point): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  if (overmind.state.canvas.invertedCanvas) {
    ctx.fillStyle = overmind.state.canvas.invertedCanvas;
  }

  ctx.fillRect(position.x, 0, 1, canvas.height);
  ctx.fillRect(0, position.y, canvas.width, 1);
}
