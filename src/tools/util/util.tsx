import { Point } from '../../types';
import { Tool } from '../Tool';

export function getMousePos(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): Point {
  const canvas: HTMLCanvasElement = event.currentTarget;
  const rect = canvas.getBoundingClientRect(); // abs. size of element
  const scaleX = canvas.width / rect.width; // relationship bitmap vs. element for X
  const scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y

  return {
    x: Math.floor((event.clientX - rect.left) * scaleX), // scale mouse coordinates after they have
    y: Math.floor((event.clientY - rect.top) * scaleY), // been adjusted to be relative to element
  };
}

export function pointEquals(point1: Point, point2: Point): boolean {
  return point1.x === point2.x && point1.y === point2.y;
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
    | 'onClickOverlay'
): (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void {
  if (hasKey(tool, eventHandlerName)) {
    return (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void =>
      tool[eventHandlerName]?.(event);
  }
  return (): void => {};
}

function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

export function isRightMouseButton(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
): boolean {
  return event.button === 2 || event.buttons === 2;
}

// The middle button is reserved app-wide for toggling the menu
// (GlobalHotkeyManager's useMiddleClickMenuToggle). Canvas tools never act on
// it, so Canvas.tsx checks this before dispatching to any tool handler.
export function isMiddleMouseButton(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
): boolean {
  return event.button === 1 || event.buttons === 4;
}

export function isLeftMouseButton(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): boolean {
  return event.button === 1 || event.buttons === 1;
}

export function isLeftOrRightMouseButton(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
): boolean {
  return isLeftMouseButton(event) || isRightMouseButton(event);
}

