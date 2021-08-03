import { Point, Color } from '../../types';
import { Tool } from '../Tool';
import { CustomBrush } from '../../brush/CustomBrush';
import { overmind } from '../../index';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';

export function colorToRGBString(color: Color): string {
  return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
}

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

export function points8Connected(point1: Point, point2: Point): boolean {
  return Math.abs(point1.x - point2.x) <= 1 && Math.abs(point1.y - point2.y) <= 1;
}

export function clearCanvas(canvas: HTMLCanvasElement, color: Color): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.rect(0, 0, canvas.width, canvas.height);
  const oldFillStyle = ctx.fillStyle;
  ctx.fillStyle = colorToRGBString(color);
  ctx.fill();
  ctx.fillStyle = oldFillStyle;
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      tool[eventHandlerName]!(event);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
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

export function isLeftOrRightMouseButton(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>
): boolean {
  return isLeftMouseButton(event) || isRightMouseButton(event);
}

// eslint-disable-next-line max-len
// adapted from https://stackoverflow.com/questions/11472273/how-to-edit-pixels-and-remove-white-background-in-a-canvas-image-in-html5-and-ja
export function extractBrush(
  sourceCanvas: HTMLCanvasElement,
  start: Point,
  width: number,
  height: number
): CustomBrush {
  // Extract color index and add tansparency for background color

  const colorIndex = paintingCanvasController.getIndexForArea(start.x, start.y, width, height);
  if (!colorIndex) {
    throw 'Error retrieving color index for new brush';
  }

  const colorIndexWithTransparency = addTransparency(
    colorIndex,
    Number(overmind.state.palette.backgroundColorId)
  );

  return new CustomBrush(colorIndexWithTransparency, width, height);
}

export function addTransparency(texture: Uint8Array, transparentColorIndex: number): Uint8Array {
  return texture.map((item) => (item === transparentColorIndex ? 0 : item));
}

interface Omit {
  // eslint-disable-next-line @typescript-eslint/ban-types
  <T extends object, K extends [...(keyof T)[]]>(obj: T, ...keys: K): {
    [K2 in Exclude<keyof T, K[number]>]: T[K2];
  };
}

export const omit: Omit = (obj, ...keys) => {
  const ret = {} as {
    [K in keyof typeof obj]: typeof obj[K];
  };
  let key: keyof typeof obj;
  for (key in obj) {
    if (!keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
};
