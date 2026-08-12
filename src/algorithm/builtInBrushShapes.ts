// Shape generators backing the built-in brushes' right-click resize (see
// docs/brush-transforms.md, "Sizing a built-in brush"). DPaint regenerated its
// round/square pens procedurally on resize rather than bitmap-stretching them
// (CURBRUSH.C: RoundPen/SquarePen), which is why they stayed crisp at any size.
// These mirror that instead of routing through the pixel-art nearest-neighbor
// `resize()` used for custom brushes.
//
// All bitmaps are top-down string arrays of '.'/'@', the same convention
// `BrushColorIndex.fromBuiltInBrushStringBitmap` expects.

export type BuiltInFamily = 'round' | 'square' | 'dither';

// A filled ellipse inscribed in width x height: the round family (dot3x3/
// dot5x5/dot7x7 in the toolbar). Using an ellipse rather than a fixed-radius
// circle means a non-uniform drag (Shift not held) still produces a sensible
// shape instead of clamping to a circle.
export function roundBitmap(width: number, height: number): string[] {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const rx = w / 2;
  const ry = h / 2;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    const dy = (y - cy) / ry;
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / rx;
      row += dx * dx + dy * dy <= 1 ? '@' : '.';
    }
    rows.push(row);
  }
  return rows;
}

// A solid block: the square family (square2x2/.../square8x8). A resize of a
// solid fill has no resampling artifact either way, so this is really just
// `resize()` made explicit; kept as its own generator so all three families go
// through the same interface.
export function squareBitmap(width: number, height: number): string[] {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  return Array.from({ length: h }, () => '@'.repeat(w));
}

// The dither family (dither3x3/dither7x6) is a hand-placed sparse scatter, not
// a shape that can be stretched to an arbitrary size without turning to mush.
// DPaint didn't try: dragging its DOT_B pen snapped to one of 6 fixed bitmaps
// (CURBRUSH.C: dots10..dots60, decoded below from the original Amiga bitplane
// data in docs/reference/dpaint-source/src/DOTBMS.C, 16-bit words, MSB-first,
// sizes 4s+1 for s=1..6). Resizing a dither brush here snaps to the nearest of
// these the same way.
const ditherBitmaps: readonly string[][] = [
  ['@....', '.....', '....@', '.....', '.@...'],
  ['....@....', '.........', '.........', '........@', '@...@....', '.........', '.........', '.........', '.....@...'],
  [
    '.....@.......',
    '.............',
    '.........@...',
    '.@...........',
    '......@.....@',
    '.............',
    '.............',
    '.....@.......',
    '@..........@.',
    '.............',
    '.............',
    '....@........',
    '........@....',
  ],
  [
    '.........@.......',
    '.................',
    '...@.............',
    '.............@...',
    '.................',
    '.......@.........',
    '.................',
    '@................',
    '................@',
    '.........@.......',
    '.................',
    '.................',
    '..@..............',
    '............@....',
    '.................',
    '.................',
    '.......@.........',
  ],
  [
    '........@............',
    '.....................',
    '...............@.....',
    '..@..................',
    '.....................',
    '.........@...........',
    '.....................',
    '.............@.......',
    '....................@',
    '.....@...............',
    '.....................',
    '@....................',
    '.....................',
    '........@.....@......',
    '...................@.',
    '..@..................',
    '.....................',
    '.....................',
    '.....................',
    '............@........',
    '.......@.............',
  ],
  [
    '...........@.............',
    '.........................',
    '.........................',
    '...@.....................',
    '....................@....',
    '........@................',
    '.............@...........',
    '.........................',
    '..................@......',
    '.........................',
    '@........................',
    '........@................',
    '........................@',
    '.........................',
    '....@..........@.........',
    '.........................',
    '.........................',
    '.........................',
    '...........@.............',
    '.........................',
    '....@...............@....',
    '.........................',
    '.........................',
    '.........................',
    '...........@.............',
  ],
];

export function nearestDitherBitmap(width: number, height: number): string[] {
  const target = (width + height) / 2;
  let closest = ditherBitmaps[0];
  let closestDiff = Infinity;
  for (const bitmap of ditherBitmaps) {
    const diff = Math.abs(bitmap.length - target);
    if (diff < closestDiff) {
      closest = bitmap;
      closestDiff = diff;
    }
  }
  return closest;
}

export function generateBuiltInBitmap(
  family: BuiltInFamily,
  width: number,
  height: number
): string[] {
  switch (family) {
    case 'round':
      return roundBitmap(width, height);
    case 'square':
      return squareBitmap(width, height);
    case 'dither':
      return nearestDitherBitmap(width, height);
  }
}
