import { BrushColorIndex } from '../domain/BrushColorIndex';

// Brush transformations (see docs/brush-transforms.md): pure functions
// reshaping a brush bitmap, ported from DPaint's Brush menu (reference source
// in docs/reference/dpaint-source/src/BRXFORM.C, ROT90.C, STRETCH.C).
//
// Every function returns a new BrushColorIndex; the source is never mutated.
// Pixels move as whole RGBA quads, so indexed, true-color and transparent
// pixels (the alpha tag) all survive any transform unchanged.
//
// Rows in the index array are stored bottom-up (GL texture convention).
// Horizontal/vertical flips are the same operation in either row order, and
// resize sampling is anchor-agnostic for the integer factors used here, so
// only rotate90 needs to care (see its mapping derivation).

const STRIDE = 4;

function copyPixel(
  source: Uint8Array,
  sourceOffset: number,
  target: Uint8Array,
  targetOffset: number
): void {
  target[targetOffset] = source[sourceOffset];
  target[targetOffset + 1] = source[sourceOffset + 1];
  target[targetOffset + 2] = source[sourceOffset + 2];
  target[targetOffset + 3] = source[sourceOffset + 3];
}

// Mirror left-right.
export function flipHorizontal(brush: BrushColorIndex): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const result = new Uint8Array(indexArray.length);
  for (let y = 0; y < height; y++) {
    const row = y * width * STRIDE;
    for (let x = 0; x < width; x++) {
      copyPixel(indexArray, row + x * STRIDE, result, row + (width - x - 1) * STRIDE);
    }
  }
  return new BrushColorIndex(width, height, result);
}

// Mirror top-bottom.
export function flipVertical(brush: BrushColorIndex): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const result = new Uint8Array(indexArray.length);
  const rowBytes = width * STRIDE;
  for (let y = 0; y < height; y++) {
    result.set(indexArray.subarray(y * rowBytes, (y + 1) * rowBytes), (height - y - 1) * rowBytes);
  }
  return new BrushColorIndex(width, height, result);
}

// Rotate 90 degrees clockwise (visually); width and height swap.
export function rotate90(brush: BrushColorIndex): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const result = new Uint8Array(indexArray.length);
  // In bottom-up storage coordinates a visual clockwise rotation maps
  // destination (x, y) to source (width-1-y, x): destination width is the
  // source height, so x ranges over source rows and y over source columns.
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < height; x++) {
      const sourceOffset = (x * width + (width - y - 1)) * STRIDE;
      copyPixel(indexArray, sourceOffset, result, (y * height + x) * STRIDE);
    }
  }
  return new BrushColorIndex(height, width, result);
}

// Rotate by any angle, degrees clockwise (visually) — rotate(b, 90) matches
// rotate90(b) exactly. Rasterized by inverse mapping (like DPaint's BMRot in
// ROTATE.C): every destination pixel center is rotated back into source
// space and sampled nearest, so there are no holes. The bounding box grows
// to fit; uncovered pixels stay transparent.
export function rotate(brush: BrushColorIndex, degrees: number): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const newWidth = Math.max(1, Math.round(Math.abs(width * cos) + Math.abs(height * sin)));
  const newHeight = Math.max(1, Math.round(Math.abs(width * sin) + Math.abs(height * cos)));
  const result = new Uint8Array(newWidth * newHeight * STRIDE);
  // visual coordinates (y down), both rectangles center-aligned; rows are
  // stored bottom-up, hence the flipped row lookups
  for (let vy = 0; vy < newHeight; vy++) {
    const targetRow = (newHeight - vy - 1) * newWidth;
    for (let vx = 0; vx < newWidth; vx++) {
      const relX = vx + 0.5 - newWidth / 2;
      const relY = vy + 0.5 - newHeight / 2;
      // inverse of the visual-clockwise rotation
      const sourceX = Math.floor(relX * cos + relY * sin + width / 2);
      const sourceVY = Math.floor(-relX * sin + relY * cos + height / 2);
      if (sourceX < 0 || sourceX >= width || sourceVY < 0 || sourceVY >= height) {
        continue; // outside the source: stays transparent
      }
      const sourceOffset = ((height - sourceVY - 1) * width + sourceX) * STRIDE;
      copyPixel(indexArray, sourceOffset, result, (targetRow + vx) * STRIDE);
    }
  }
  return new BrushColorIndex(newWidth, newHeight, result);
}

// Horizontal shear, a direct port of DPaint's BMShearX (SHEAR.C): the visual
// top row stays anchored and each row below shifts progressively toward the
// bottom row's total offset of dx pixels (right for positive dx), advanced by
// an integer error term — no resampling, every pixel just moves. The output
// widens by |dx| so nothing clips; uncovered pixels stay transparent.
export function shearHorizontal(brush: BrushColorIndex, dx: number): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const shift = Math.trunc(Math.abs(dx));
  if (shift === 0) {
    return new BrushColorIndex(width, height, new Uint8Array(indexArray));
  }
  const newWidth = width + shift;
  const result = new Uint8Array(newWidth * height * STRIDE);
  const rowBytes = width * STRIDE;
  // DPaint's loop runs top row first with offset 0 (or |dx| when shearing
  // left, so the widened bitmap still starts at x=0); rows are stored
  // bottom-up here, hence the h-1-v storage row lookup
  let x = dx < 0 ? shift : 0;
  const xinc = dx < 0 ? -1 : 1;
  let sum = Math.trunc(height / 2);
  for (let v = 0; v < height; v++) {
    const sourceY = height - v - 1;
    result.set(
      indexArray.subarray(sourceY * rowBytes, (sourceY + 1) * rowBytes),
      (sourceY * newWidth + x) * STRIDE
    );
    sum += shift;
    while (sum > height) {
      x += xinc;
      sum -= height;
    }
  }
  return new BrushColorIndex(newWidth, height, result);
}

// Nearest-neighbor resize (no filtering — pixel art). Both dimensions are
// clamped to at least 1. Halve/Double and the interactive Stretch are all
// this function with computed target dimensions.
export function resize(
  brush: BrushColorIndex,
  targetWidth: number,
  targetHeight: number
): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const newWidth = Math.max(1, Math.floor(targetWidth));
  const newHeight = Math.max(1, Math.floor(targetHeight));
  const result = new Uint8Array(newWidth * newHeight * STRIDE);
  for (let y = 0; y < newHeight; y++) {
    const sourceY = Math.floor((y * height) / newHeight);
    const sourceRow = sourceY * width * STRIDE;
    const targetRow = y * newWidth * STRIDE;
    for (let x = 0; x < newWidth; x++) {
      const sourceX = Math.floor((x * width) / newWidth);
      copyPixel(indexArray, sourceRow + sourceX * STRIDE, result, targetRow + x * STRIDE);
    }
  }
  return new BrushColorIndex(newWidth, newHeight, result);
}
