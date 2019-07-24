import { Tool } from './Tool';
import { ToolState, Action } from './ToolState';
import { PaletteState } from '../components/palette/PaletteState';
import { Point, Color } from '../types';
import { getMousePos } from './util';

interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class FloodFillTool implements Tool {
  public onClick(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }

    const position = getMousePos(canvas, event);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    floodFill(imageData, paletteState.foregroundColor, position);
    ctx.putImageData(imageData, 0, 0);
  }

  public onContextMenu(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    event.preventDefault();
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }

    const position = getMousePos(canvas, event);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    floodFill(imageData, paletteState.backgroundColor, position);
    ctx.putImageData(imageData, 0, 0);
  }

  public onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseMove FloodFillTool');
  }

  public onMouseUp(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseUp FloodFillTool');
  }

  public onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseDown FloodFillTool');
  }

  public onMouseLeave(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseLeave FloodFillTool');
  }

  public onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseEnter FloodFillTool');
  }
}

function getColorAtPixel(imageData: ImageData, x: number, y: number): ColorRGBA {
  const { width, data } = imageData;

  return {
    r: data[4 * (width * y + x) + 0],
    g: data[4 * (width * y + x) + 1],
    b: data[4 * (width * y + x) + 2],
    a: data[4 * (width * y + x) + 3],
  };
}

function setColorAtPixel(imageData: ImageData, color: ColorRGBA, x: number, y: number): void {
  const { width, data } = imageData;

  data[4 * (width * y + x) + 0] = color.r & 0xff;
  data[4 * (width * y + x) + 1] = color.g & 0xff;
  data[4 * (width * y + x) + 2] = color.b & 0xff;
  data[4 * (width * y + x) + 3] = color.a & 0xff;
}

function colorMatch(a: ColorRGBA, b: ColorRGBA): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

function floodFill(imageData: ImageData, color: Color, point: Point): void {
  const { width, height } = imageData;
  const newColor = { ...color, a: 255 };
  const stack = [];
  const baseColor = getColorAtPixel(imageData, Math.floor(point.x), Math.floor(point.y));
  let position: Point | undefined = { x: Math.floor(point.x), y: Math.floor(point.y) };

  // Check if base color and new color are the same
  if (colorMatch(baseColor, newColor)) {
    return;
  }

  // Add the clicked location to stack
  stack.push({ x: position.x, y: position.y });

  while (stack.length) {
    position = stack.pop();
    if (!position) {
      return;
    }
    let contiguousDown = true; // Vertical is assumed to be true
    let contiguousUp = true; // Vertical is assumed to be true
    let contiguousLeft = false;
    let contiguousRight = false;

    // Move to top most contiguousUp pixel
    while (contiguousUp && position.y >= 0) {
      position.y--;
      contiguousUp = colorMatch(getColorAtPixel(imageData, position.x, position.y), baseColor);
    }
    position.y++;

    // Move down
    while (contiguousDown && position.y < height) {
      setColorAtPixel(imageData, newColor, position.x, position.y);

      // Check left
      if (
        position.x - 1 >= 0 &&
        colorMatch(getColorAtPixel(imageData, position.x - 1, position.y), baseColor)
      ) {
        if (!contiguousLeft) {
          contiguousLeft = true;
          stack.push({ x: position.x - 1, y: position.y });
        }
      } else {
        contiguousLeft = false;
      }

      // Check right
      if (
        position.x + 1 < width &&
        colorMatch(getColorAtPixel(imageData, position.x + 1, position.y), baseColor)
      ) {
        if (!contiguousRight) {
          stack.push({ x: position.x + 1, y: position.y });
          contiguousRight = true;
        }
      } else {
        contiguousRight = false;
      }

      position.y++;
      contiguousDown = colorMatch(getColorAtPixel(imageData, position.x, position.y), baseColor);
    }
  }
}
