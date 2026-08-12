// The procedural shapes behind the built-in brushes' right-click resize (see
// docs/brush-transforms.md, "Sizing a built-in brush"). DPaint regenerated its
// round/square pens on resize rather than bitmap-stretching them (CURBRUSH.C:
// RoundPen/SquarePen), which is why they stayed crisp at any size. These mirror
// that instead of routing through the pixel-art nearest-neighbor `resize()`
// used for custom brushes.
//
// The dither family has no generator: it is fixed art, and lives with the rest
// of the built-in art in brush/BuiltInBrushFactory.tsx.
//
// Bitmaps are top-down string arrays of '.'/'@', the convention
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
// solid fill has no resampling artifact either way, so this is `resize()` made
// explicit, kept as a generator so the family dispatch has one per family.
export function squareBitmap(width: number, height: number): string[] {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  return Array.from({ length: h }, () => '@'.repeat(w));
}
