import { FillRectIndexer } from './indexer/FillRectIndexer';
import { DrawImageIndexer } from './indexer/DrawImageIndexer';
import { CustomBrush } from '../brush/CustomBrush';
import { overmind } from '../index';

// The color index matrix representing the canvas as a two dimensional array.
// Each value in the matrix represents the color index (index of palette color) of the corresponding
// pixel, starting from the upper left corner of the canvas (0, 0).
//const index: number[][] = [];

let gl: WebGLRenderingContext | null = null;

let fillRectIndexer: FillRectIndexer | null = null;
let drawImageIndexer: DrawImageIndexer | null = null;

export function init(width: number, height: number): void {
  const backgroundColor = Number(overmind.state.palette.backgroundColorId);
  /*   // initialize the color index matrix with the initial background color


  console.log('bg: ' + backgroundColor);
  for (let i = 0; i < height; i++) {
    index[i] = new Array(width).fill(backgroundColor);
  } */

  // init a webgl context for a canvas element outside the DOM

  const canvas = document.createElement('canvas');
  canvas.width = 50;
  canvas.height = 50;

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
  const targetTextureWidth = gl.drawingBufferHeight;
  const targetTextureHeight = gl.drawingBufferWidth;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
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

  // set the filtering so we don't need mips

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

export function getIndex(): void {
  if (!gl) {
    alert('no webl!');
    return;
  }

  console.log('h: ' + gl?.drawingBufferHeight);
  console.log('w: ' + gl?.drawingBufferWidth);

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
  const tempIndex = [];
  for (let i = 0; i < pixels.length; i = i + 4) {
    tempIndex.push(pixels[i]);
  }
  toBitmapString(tempIndex, gl.drawingBufferWidth);
}

function toBitmapString(indexArray: number[], width: number): void {
  let j = 0;
  let row = '';
  let rowNumber = 1;
  const rows = [];
  for (let i = 0; i < indexArray.length; i++) {
    j++;
    row = row + indexArray[i];
    if (j === width) {
      j = 0;
      //console.log(rowNumber + ': ' + row);
      rows.unshift(rowNumber + ': ' + row);
      row = '';
      rowNumber++;
    }
  }
  rows.forEach(item => console.log(item));
}
