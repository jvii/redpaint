import { FillRectIndexer } from './indexer/FillRectIndexer';
import { DrawImageIndexer } from './indexer/DrawImageIndexer';
import { CustomBrush } from '../brush/CustomBrush';
import { overmind } from '../index';
import { Point } from '../types';

// The color index matrix representing the canvas as a two dimensional array.
// Each value in the matrix represents the color index (index of palette color) of the corresponding
// pixel, starting from the upper left corner of the canvas (0, 0).
//const index: number[][] = [];

let gl: WebGLRenderingContext | null = null;

let fillRectIndexer: FillRectIndexer | null = null;
let drawImageIndexer: DrawImageIndexer | null = null;

export function init(width: number, height: number): void {
  // init a webgl context for a canvas element outside the DOM

  const canvas = document.createElement('canvas');
  canvas.width = overmind.state.canvas.resolution.width;
  canvas.height = overmind.state.canvas.resolution.height;

  gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true,
    antialias: false,
  });

  if (!gl) {
    alert('Sorry, ReDPaint requires WebGL support:(');
    return;
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

  console.log('webgl initialized');

  // create indexers

  fillRectIndexer = new FillRectIndexer(gl);
  drawImageIndexer = new DrawImageIndexer(gl);
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
    rectLowerLeftY = gl.drawingBufferHeight - (y - Math.abs(height) + Math.abs(height));
  } else {
    rectLowerLeftY = gl.drawingBufferHeight - (y + Math.abs(height));
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

export function visualiseTexture(texture: Uint8Array, width: number): void {
  console.log('width: ' + width);
  const indexRedComponent = [];
  for (let i = 0; i < texture.length; i = i + 4) {
    indexRedComponent.push(texture[i]);
  }
  let j = 0;
  let row = '';
  let rowNumber = 1;
  const rows = [];
  for (let i = 0; i < indexRedComponent.length; i++) {
    j++;
    row = row + indexRedComponent[i];
    if (j === width) {
      j = 0;
      rows.unshift(rowNumber + ': ' + row); // unshift as texture y coords start from bottom
      row = '';
      rowNumber++;
    }
  }
  rows.forEach((item, index) => {
    if (index < 100) {
      console.log(item.substring(0, 100));
    }
  });
}

/* export function colorizeTexture(texture: Uint8Array, colorIndex: number): void {
  texture.forEach((item, index) => {
    if (item !== 0) {
      texture[index] = colorIndex;
    }
  });
} */

export function colorizeTexture(texture: Uint8Array, colorIndex: number): Uint8Array {
  return texture.map(item => (item !== 0 ? colorIndex : item));
}
