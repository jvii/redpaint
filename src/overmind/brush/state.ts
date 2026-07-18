import { PixelBrush } from '../../brush/PixelBrush';
import { createBuiltInBrush } from '../../brush/BuiltInBrushFactory';

import type { Mode } from './mode';
export type { Mode } from './mode';
export { usesEffectDraw } from './mode';
export type BuiltInBrushId = keyof typeof builtInBrushes;

export const builtInBrushes = {
  1: new PixelBrush(),
  2: createBuiltInBrush('dot3x3'),
  3: createBuiltInBrush('dot5x5'),
  4: createBuiltInBrush('dot7x7'),
  5: createBuiltInBrush('square2x2'),
  6: createBuiltInBrush('square4x4'),
  7: createBuiltInBrush('square6x6'),
  8: createBuiltInBrush('square8x8'),
  9: createBuiltInBrush('dither3x3'),
  10: createBuiltInBrush('dither7x6'),
};

// Built-in brushes are CustomBrush instances too (except the pixel brush),
// so "is this one of the built-ins" is an identity check against the
// registry above.
export function isBuiltInBrush(brush: unknown): boolean {
  return Object.values(builtInBrushes).includes(brush as never);
}

export type State = {
  // null when a custom (captured or loaded) brush is active
  selectedBuiltInBrushId: BuiltInBrushId | null;
  mode: Mode;
  // reactive mirrors of brushHistory's recall references (the class itself
  // is not observable state) — they drive the Restore menu item's disabled
  // state; see docs/brush-slots.md for the recall chain
  hasOriginalBrush: boolean;
  hasLastCustomBrush: boolean;
};

export const state: State = {
  selectedBuiltInBrushId: 1,
  mode: 'Color',
  hasOriginalBrush: false,
  hasLastCustomBrush: false,
};
