import { FillRectIndexer } from './indexer/FillRectIndexer';
import { DrawImageIndexer } from './indexer/DrawImageIndexer';
import { CustomBrush } from '../brush/CustomBrush';
import { overmind } from '../index';
import { createIndexerGLContext } from './indexer/IndexerContext';
import { ColorIndexRenderer } from './renderer/ColorIndexRenderer';
import { createRendererGLContext } from './renderer/RendererContext';
import { visualiseTexture } from './util';
import { Point } from '../types';

let gl: WebGLRenderingContext | null = null;

let fillRectIndexer: FillRectIndexer | null = null;
let drawImageIndexer: DrawImageIndexer | null = null;

let colorIndexRenderer: ColorIndexRenderer | null = null;

export function initColorIndex(): void {
  const width = overmind.state.canvas.resolution.width;
  const height = overmind.state.canvas.resolution.height;
  const backgroundColorId = Number(overmind.state.palette.backgroundColorId);

  gl = createIndexerGLContext(width, height, backgroundColorId);

  // create indexers

  fillRectIndexer = new FillRectIndexer(gl);
  drawImageIndexer = new DrawImageIndexer(gl);

  // create renderer

  colorIndexRenderer = new ColorIndexRenderer(createRendererGLContext(width, height));
}

export function indexFillRect(
  x: number,
  y: number,
  width: number,
  heigth: number,
  colorIndex: number
): void {
  fillRectIndexer?.indexFillRect(x, y, width, heigth, colorIndex);
}

export function indexDrawImage(x: number, y: number, brush: CustomBrush): void {
  drawImageIndexer?.indexDrawImage(x, y, brush);
}

export function renderToCanvas(destinationCanvasCtx: CanvasRenderingContext2D): void {
  // render to given canvas from color index
  const index = getIndex();
  if (!index) {
    return;
  }
  const palette = overmind.state.palette.paletteArray;
  colorIndexRenderer?.render(destinationCanvasCtx, index, palette);
}

export function resetIndex(): void {
  if (!gl) {
    alert('no webl!');
    return undefined;
  }
  // create a texture to render to

  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const targetTextureWidth = gl.drawingBufferWidth;
  const targetTextureHeight = gl.drawingBufferHeight;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  // initialize the color index matrix with the initial background color
  const backgroundColor = Number(overmind.state.palette.backgroundColorId);
  const data = new Uint8Array(gl.drawingBufferHeight * gl.drawingBufferWidth * 4).fill(
    backgroundColor
  );
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    targetTextureWidth,
    targetTextureHeight,
    border,
    format,
    type,
    data
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // create and bind the framebuffer

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // attach the texture as the first color attachment

  const attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
}

export function getIndex(): Uint8Array | undefined {
  if (!gl) {
    alert('no webl!');
    return undefined;
  }

  const pixels = new Uint8Array(gl.drawingBufferHeight * gl.drawingBufferWidth * 4);
  gl.readPixels(
    0,
    0,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  return pixels;
}

export function getAreaFromIndex(
  x: number, // canvas coord (origin upper left corner)
  y: number, // canvas coord (origin upper left corner)
  width: number, // canvas coord, can be negative
  height: number // canvas coord, can be negative
): Uint8Array | undefined {
  if (!gl) {
    alert('no webl!');
    return undefined;
  }
  // for readPixels we need to define the area with:
  // - lower left corner of the area and
  // - width and height as positive integers
  // Texture coordinates

  let rectLowerLeftX: number;
  let rectLowerLeftY: number;

  if (width < 0) {
    rectLowerLeftX = x - Math.abs(width);
  } else {
    rectLowerLeftX = x;
  }

  if (height < 0) {
    rectLowerLeftY = gl.drawingBufferHeight - y;
  } else {
    rectLowerLeftY = gl.drawingBufferHeight - y - Math.abs(height);
  }

  const pixels = new Uint8Array(Math.abs(width) * Math.abs(height) * 4);
  console.log('canvas: x:' + x + ' y: ' + y + ' w: ' + width + ' h: ' + height);
  console.log(
    'texture: x:' +
      rectLowerLeftX +
      ' y: ' +
      rectLowerLeftY +
      ' w: ' +
      Math.abs(width) +
      ' h: ' +
      Math.abs(height)
  );
  console.log('gl.drawingBufferHeight: ' + gl.drawingBufferHeight);
  gl.readPixels(
    rectLowerLeftX,
    rectLowerLeftY,
    Math.abs(width),
    Math.abs(height),
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  return pixels;
}

export function getColorIndexForPixel(point: Point): number | undefined {
  const colorIndex = getAreaFromIndex(point.x, point.y, 1, 1);
  return colorIndex?.[0];
}

// testing, debugging purposes only
export function visualiseIndex(): void {
  if (!gl) {
    alert('no webl!');
    return undefined;
  }
  const index = getIndex();
  if (!index) {
    return;
  }
  const width = gl.drawingBufferWidth;
  visualiseTexture(index, width);
}
