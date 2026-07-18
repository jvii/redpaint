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

// A bend's control offsets: one quadratic Bezier from `start` (offset of the
// first row/column) through the `control` point (offset `middle`, sitting at
// row/column `middleAt`) to `end` (offset of the last row/column). In a
// DPaint bend drag exactly one of the three is nonzero — the pointer's
// region picks which — but the math is uniform.
export type BendControls = {
  start: number;
  middle: number;
  middleAt: number;
  end: number;
};

// Per-row (or per-column) integer offsets along the bend curve, first sample
// per cell winning like DPaint's hBendOp, gaps filled from the previous cell.
// Exported for the bend tools, which need the same numbers for preview
// placement and the bent outline.
export function bendOffsets(count: number, bend: BendControls): number[] {
  const controlAt = Math.min(count - 1, Math.max(0, bend.middleAt));
  const offsets: (number | null)[] = new Array(count).fill(null);
  // the ends anchor exactly on their controls — sampling alone would let a
  // mid-curve value claim an end cell first
  offsets[0] = Math.round(bend.start);
  offsets[count - 1] = Math.round(bend.end);
  const steps = Math.max(64, count * 4);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) * (1 - t);
    const b = 2 * t * (1 - t);
    const c = t * t;
    const cell = Math.round(b * controlAt + c * (count - 1));
    if (cell >= 0 && cell < count && offsets[cell] === null) {
      offsets[cell] = Math.round(a * bend.start + b * bend.middle + c * bend.end);
    }
  }
  let previous = offsets.find((offset) => offset !== null) ?? 0;
  return offsets.map((offset) => {
    previous = offset ?? previous;
    return previous;
  });
}

// Bend horizontally, DPaint's BMBendH (BEND.C): every row shifts sideways by
// its position on the bend curve — a shear whose offset follows a quadratic
// instead of a line. The output widens to fit the extremes; uncovered pixels
// stay transparent. Controls run visually top to bottom.
export function bendHorizontal(brush: BrushColorIndex, bend: BendControls): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const offsets = bendOffsets(height, bend);
  const minOffset = Math.min(0, ...offsets);
  const maxOffset = Math.max(0, ...offsets);
  const newWidth = width + maxOffset - minOffset;
  const result = new Uint8Array(newWidth * height * STRIDE);
  const rowBytes = width * STRIDE;
  for (let v = 0; v < height; v++) {
    const y = height - v - 1; // rows are stored bottom-up
    result.set(
      indexArray.subarray(y * rowBytes, (y + 1) * rowBytes),
      (y * newWidth + offsets[v] - minOffset) * STRIDE
    );
  }
  return new BrushColorIndex(newWidth, height, result);
}

// Bend vertically (BMBendV): the transpose — every column shifts up or down
// along the curve, the output growing in height. Controls run left to right.
export function bendVertical(brush: BrushColorIndex, bend: BendControls): BrushColorIndex {
  const { width, height, indexArray } = brush;
  const offsets = bendOffsets(width, bend);
  const minOffset = Math.min(0, ...offsets);
  const maxOffset = Math.max(0, ...offsets);
  const newHeight = height + maxOffset - minOffset;
  const result = new Uint8Array(width * newHeight * STRIDE);
  for (let x = 0; x < width; x++) {
    // a positive offset moves the column visually down: in bottom-up storage
    // that lowers the row index
    const drop = offsets[x] - minOffset;
    for (let y = 0; y < height; y++) {
      const targetY = y + (newHeight - height) - drop;
      copyPixel(indexArray, (y * width + x) * STRIDE, result, (targetY * width + x) * STRIDE);
    }
  }
  return new BrushColorIndex(width, newHeight, result);
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
