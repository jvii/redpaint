import { Point, Color } from '../../types';
import { Tool } from '../Tool';

export function colorToRGBString(color: Color): string {
  return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
}

export type HSV = {
  h: number; // 0..359
  s: number; // 0..100
  v: number; // 0..100
};

export function rgbToHsv(color: Color): HSV {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) {
    h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
}

export function hsvToRgb(hsv: HSV): Color {
  const h = hsv.h / 60;
  const s = hsv.s / 100;
  const v = hsv.v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 1) {
    [r, g, b] = [c, x, 0];
  } else if (h < 2) {
    [r, g, b] = [x, c, 0];
  } else if (h < 3) {
    [r, g, b] = [0, c, x];
  } else if (h < 4) {
    [r, g, b] = [0, x, c];
  } else if (h < 5) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
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
// (GlobalHotkeyManager's useMiddleClickMenuToggle) — canvas tools never act
// on it, so Canvas.tsx checks this before dispatching to any tool handler.
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

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
}
