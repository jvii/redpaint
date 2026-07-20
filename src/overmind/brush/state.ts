import { PixelBrush } from '../../brush/PixelBrush';
import { createBuiltInBrush } from '../../brush/BuiltInBrushFactory';
import { BRUSH_SLOT_COUNT } from '../../brush/BrushSlots';

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

// Reactive mirror of one brushSlots entry (docs/brush-slots.md Phase B) —
// the class instance itself stays out of Overmind state, like brushRecall.
export type BrushSlotState = {
  occupied: boolean;
  thumbnail: string | null;
  // the brush's own pixel dimensions, captioned onto the thumbnail — a
  // scaled-to-fit thumbnail can't show actual size, and this is cheaper
  // than reading it back out of the rendered image
  size: { width: number; height: number } | null;
};

export type State = {
  // null when a custom (captured or loaded) brush is active
  selectedBuiltInBrushId: BuiltInBrushId | null;
  mode: Mode;
  // reactive mirrors of brushRecall's recall references (the class itself
  // is not observable state) — they drive the Restore menu item's disabled
  // state; see docs/brush-slots.md for the recall chain
  hasOriginalBrush: boolean;
  hasLastCustomBrush: boolean;
  slots: BrushSlotState[];
  // mirror of brushRecall.previousBrush (docs/brush-slots.md) — the
  // automatically-managed companion to the curated slots above
  previousSlot: BrushSlotState;
};

export const state: State = {
  selectedBuiltInBrushId: 1,
  mode: 'Color',
  hasOriginalBrush: false,
  hasLastCustomBrush: false,
  slots: Array.from({ length: BRUSH_SLOT_COUNT }, () => ({
    occupied: false,
    thumbnail: null,
    size: null,
  })),
  previousSlot: { occupied: false, thumbnail: null, size: null },
};
