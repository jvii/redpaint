import { describe, expect, test } from 'vitest';
import {
  flipHorizontal,
  flipVertical,
  rotate90,
  rotate,
  resize,
  shearHorizontal,
  bendHorizontal,
  bendVertical,
  mirrorHandleX,
  mirrorHandleY,
  rotateHandle90,
  scaleHandle,
} from '../../src/algorithm/brushTransform';
import { Point } from '../../src/types';
import { BrushColorIndex } from '../../src/domain/BrushColorIndex';
import { ALPHA_INDEXED, ALPHA_TRUECOLOR } from '../../src/domain/CanvasColorIndex';

// Builds a brush from visual rows (top row first — flipped into the array's
// bottom-up storage order): '.' is transparent, a digit an indexed pixel with
// that stored color index.
function brushFrom(visualRows: string[]): BrushColorIndex {
  const width = visualRows[0].length;
  const height = visualRows.length;
  const indexArray = new Uint8Array(width * height * 4);
  visualRows.forEach((row, visualY) => {
    const y = height - visualY - 1;
    for (let x = 0; x < width; x++) {
      const char = row.charAt(x);
      if (char !== '.') {
        indexArray[(y * width + x) * 4] = Number(char);
        indexArray[(y * width + x) * 4 + 3] = ALPHA_INDEXED;
      }
    }
  });
  return new BrushColorIndex(width, height, indexArray);
}

// Inverse of brushFrom, for readable assertions.
function visualRowsOf(brush: BrushColorIndex): string[] {
  const { width, height, indexArray } = brush;
  const rows: string[] = [];
  for (let visualY = 0; visualY < height; visualY++) {
    const y = height - visualY - 1;
    let row = '';
    for (let x = 0; x < width; x++) {
      row +=
        indexArray[(y * width + x) * 4 + 3] === ALPHA_INDEXED
          ? String(indexArray[(y * width + x) * 4])
          : '.';
    }
    rows.push(row);
  }
  return rows;
}

// An asymmetric L-shape: distinguishes every flip/rotation from every other
const lShape = ['1..', '2..', '345'];

describe('flipHorizontal', () => {
  test('mirrors left-right', () => {
    expect(visualRowsOf(flipHorizontal(brushFrom(lShape)))).toEqual(['..1', '..2', '543']);
  });

  test('applied twice is the identity', () => {
    const brush = brushFrom(lShape);
    expect(visualRowsOf(flipHorizontal(flipHorizontal(brush)))).toEqual(lShape);
  });
});

describe('flipVertical', () => {
  test('mirrors top-bottom', () => {
    expect(visualRowsOf(flipVertical(brushFrom(lShape)))).toEqual(['345', '2..', '1..']);
  });

  test('applied twice is the identity', () => {
    const brush = brushFrom(lShape);
    expect(visualRowsOf(flipVertical(flipVertical(brush)))).toEqual(lShape);
  });
});

describe('rotate90', () => {
  test('rotates clockwise and swaps dimensions', () => {
    const brush = brushFrom(['12', '34', '56']);
    const rotated = rotate90(brush);
    expect(rotated.width).toBe(3);
    expect(rotated.height).toBe(2);
    expect(visualRowsOf(rotated)).toEqual(['531', '642']);
  });

  test('applied four times is the identity', () => {
    const brush = brushFrom(lShape);
    expect(visualRowsOf(rotate90(rotate90(rotate90(rotate90(brush)))))).toEqual(lShape);
  });
});

describe('resize', () => {
  test('doubles by pixel replication', () => {
    const doubled = resize(brushFrom(['12', '34']), 4, 4);
    expect(visualRowsOf(doubled)).toEqual(['1122', '1122', '3344', '3344']);
  });

  test('halving a doubled brush restores the original', () => {
    const brush = brushFrom(lShape);
    expect(visualRowsOf(resize(resize(brush, 6, 6), 3, 3))).toEqual(lShape);
  });

  test('resizes each axis independently', () => {
    const stretched = resize(brushFrom(['12']), 2, 3);
    expect(stretched.width).toBe(2);
    expect(stretched.height).toBe(3);
    expect(visualRowsOf(stretched)).toEqual(['12', '12', '12']);
  });

  test('clamps target dimensions to at least one pixel', () => {
    const shrunk = resize(brushFrom(lShape), 0, 0);
    expect(shrunk.width).toBe(1);
    expect(shrunk.height).toBe(1);
  });
});

describe('rotate', () => {
  test('90 degrees matches the exact rotate90', () => {
    const brush = brushFrom(['12', '34', '56']);
    expect(visualRowsOf(rotate(brush, 90))).toEqual(visualRowsOf(rotate90(brush)));
  });

  test('180 degrees is both flips', () => {
    const brush = brushFrom(lShape);
    expect(visualRowsOf(rotate(brush, 180))).toEqual(
      visualRowsOf(flipHorizontal(flipVertical(brush)))
    );
  });

  test('0 degrees is a plain copy', () => {
    expect(visualRowsOf(rotate(brushFrom(lShape), 0))).toEqual(lShape);
  });

  test('45 degrees grows the bounding box and keeps every source pixel count', () => {
    const brush = brushFrom(['11', '11']);
    const rotated = rotate(brush, 45);
    expect(rotated.width).toBe(3);
    expect(rotated.height).toBe(3);
    // nearest sampling: the diamond covers at least the source's pixel count
    const opaque = visualRowsOf(rotated)
      .join('')
      .split('')
      .filter((c) => c !== '.').length;
    expect(opaque).toBeGreaterThanOrEqual(4);
  });
});

describe('shearHorizontal', () => {
  test('anchors the top row and shifts rows progressively right', () => {
    const sheared = shearHorizontal(brushFrom(['1', '2', '3']), 3);
    expect(sheared.width).toBe(4);
    expect(sheared.height).toBe(3);
    expect(visualRowsOf(sheared)).toEqual(['1...', '.2..', '..3.']);
  });

  test('negative dx shifts the bottom left, top anchored at the right', () => {
    const sheared = shearHorizontal(brushFrom(['1', '2', '3']), -3);
    expect(sheared.width).toBe(4);
    expect(visualRowsOf(sheared)).toEqual(['...1', '..2.', '.3..']);
  });

  test('dx 0 is a plain copy', () => {
    expect(visualRowsOf(shearHorizontal(brushFrom(lShape), 0))).toEqual(lShape);
  });

  test('rows keep their content, only offset changes', () => {
    const sheared = shearHorizontal(brushFrom(['12', '34']), 2);
    expect(visualRowsOf(sheared)).toEqual(['12..', '.34.']);
  });
});

describe('bendHorizontal', () => {
  test('zero controls are a plain copy', () => {
    const bent = bendHorizontal(brushFrom(lShape), { start: 0, middle: 0, middleAt: 1, end: 0 });
    expect(visualRowsOf(bent)).toEqual(lShape);
  });

  test('a middle bulge arcs the rows, ends anchored', () => {
    const bent = bendHorizontal(brushFrom(['1', '2', '3']), {
      start: 0,
      middle: 2,
      middleAt: 1,
      end: 0,
    });
    // quadratic Bezier peaks at half the control offset
    expect(visualRowsOf(bent)).toEqual(['1.', '.2', '3.']);
  });

  test('dragging the top end curves toward it', () => {
    const bent = bendHorizontal(brushFrom(['1', '2', '3']), {
      start: 2,
      middle: 0,
      middleAt: 1,
      end: 0,
    });
    expect(bent.width).toBe(3);
    expect(visualRowsOf(bent)).toEqual(['..1', '.2.', '3..']);
  });

  test('rows keep their content, only offsets change', () => {
    const bent = bendHorizontal(brushFrom(['12', '34']), {
      start: 0,
      middle: 0,
      middleAt: 0,
      end: 3,
    });
    const rows = visualRowsOf(bent);
    expect(rows[0].replace(/\./g, '')).toBe('12');
    expect(rows[1].replace(/\./g, '')).toBe('34');
  });
});

describe('bendVertical', () => {
  test('is the transpose of the horizontal bend', () => {
    const bent = bendVertical(brushFrom(['123']), { start: 0, middle: 2, middleAt: 1, end: 0 });
    expect(bent.width).toBe(3);
    expect(bent.height).toBe(2);
    // positive offsets bend downward: the middle column drops, ends anchored
    expect(visualRowsOf(bent)).toEqual(['1.3', '.2.']);
  });

  test('zero controls are a plain copy', () => {
    const bent = bendVertical(brushFrom(lShape), { start: 0, middle: 0, middleAt: 1, end: 0 });
    expect(visualRowsOf(bent)).toEqual(lShape);
  });
});

test('transforms move true-color pixels intact', () => {
  // one true-color pixel (RGB 10,20,30) at the visual top-left of a 2x1 brush
  const indexArray = new Uint8Array([10, 20, 30, ALPHA_TRUECOLOR, 0, 0, 0, 0]);
  const brush = new BrushColorIndex(2, 1, indexArray);
  const flipped = flipHorizontal(brush);
  expect(Array.from(flipped.indexArray)).toEqual([0, 0, 0, 0, 10, 20, 30, ALPHA_TRUECOLOR]);
});

describe('transparent color', () => {
  test('survives every transform, so a reshaped brush still knows its holes', () => {
    const source = new BrushColorIndex(
      2,
      2,
      new Uint8Array([
        0,
        0,
        0,
        ALPHA_INDEXED,
        1,
        0,
        0,
        ALPHA_INDEXED,
        1,
        0,
        0,
        ALPHA_INDEXED,
        0,
        0,
        0,
        ALPHA_INDEXED,
      ]),
      2
    );
    expect(source.transparentColorNumber).toBe(2);
    const transformed = [
      flipHorizontal(source),
      flipVertical(source),
      rotate90(source),
      rotate(source, Math.PI / 4),
      resize(source, 4, 4),
      shearHorizontal(source, 1),
      bendHorizontal(source, { start: 0, middle: 1, middleAt: 1, end: 0 }),
      bendVertical(source, { start: 0, middle: 1, middleAt: 1, end: 0 }),
    ];
    expect(transformed.map((b): number | undefined => b.transparentColorNumber)).toEqual(
      transformed.map((): number => 2)
    );
  });
});

describe('capture corner rules', () => {
  // Where the pixel at `corner` actually ends up, read out of the transform's
  // own output — so a rule is checked against the bitmap it claims to follow
  // rather than against a second copy of the same arithmetic.
  const markerLandsAt = (
    visualRows: string[],
    corner: Point,
    transform: (b: BrushColorIndex) => BrushColorIndex
  ): Point => {
    const marked = visualRows.map((row, y) =>
      y === corner.y ? row.slice(0, corner.x) + '9' + row.slice(corner.x + 1) : row
    );
    const out = visualRowsOf(transform(brushFrom(marked)));
    for (let y = 0; y < out.length; y++) {
      const x = out[y].indexOf('9');
      if (x >= 0) {
        return { x, y };
      }
    }
    throw new Error('marker vanished');
  };

  const rows = ['1111', '1111', '1111'];
  const size = { width: 4, height: 3 };

  test('mirrors with a horizontal flip', () => {
    const corner = { x: 0, y: 2 };
    expect(mirrorHandleX(corner, size, size)).toEqual({ x: 3, y: 2 });
    expect(markerLandsAt(rows, corner, flipHorizontal)).toEqual(mirrorHandleX(corner, size, size));
  });

  test('mirrors with a vertical flip', () => {
    const corner = { x: 3, y: 0 };
    expect(mirrorHandleY(corner, size, size)).toEqual({ x: 3, y: 2 });
    expect(markerLandsAt(rows, corner, flipVertical)).toEqual(mirrorHandleY(corner, size, size));
  });

  test('follows the pixels through a 90 degree rotation', () => {
    // every corner, since this is the rule easiest to get a quadrant wrong in
    for (const corner of [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 2 },
      { x: 3, y: 2 },
    ]) {
      const rotated = { width: size.height, height: size.width };
      expect(rotateHandle90(corner, size, rotated)).toEqual(markerLandsAt(rows, corner, rotate90));
    }
  });

  test('scales with the picture, and stays inside it when shrinking', () => {
    expect(scaleHandle({ x: 3, y: 2 }, size, { width: 8, height: 6 })).toEqual({ x: 6, y: 4 });
    // 3 of 4 into a width of 3 rounds to 2.25 -> 2, but 9 of 10 into 3 is 2.7,
    // which rounds off the end without the clamp
    expect(scaleHandle({ x: 9, y: 0 }, { width: 10, height: 1 }, { width: 3, height: 1 })).toEqual({
      x: 2,
      y: 0,
    });
  });
});
