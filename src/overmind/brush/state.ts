import { PixelBrush } from '../../brush/PixelBrush';
import { CustomBrush } from '../../brush/CustomBrush';
import { createBuiltInBrush } from '../../brush/BuiltInBrushFactory';
import { BRUSH_SLOT_COUNT } from '../../brush/BrushSlots';

import type { Mode } from './mode';
export type { Mode } from './mode';
export { usesEffectDraw } from './mode';
export type BuiltInBrushId = keyof typeof builtInBrushes;
export type HandleMode = 'center' | 'corner';

export const builtInBrushes = {
  1: new PixelBrush(),
  2: createBuiltInBrush('dot3x3', 'round'),
  3: createBuiltInBrush('dot5x5', 'round'),
  4: createBuiltInBrush('dot7x7', 'round'),
  5: createBuiltInBrush('square2x2', 'square'),
  6: createBuiltInBrush('square4x4', 'square'),
  7: createBuiltInBrush('square6x6', 'square'),
  8: createBuiltInBrush('square8x8', 'square'),
  9: createBuiltInBrush('dither3x3', 'dither'),
  10: createBuiltInBrush('dither7x6', 'dither'),
};

// Built-in brushes are CustomBrush instances too (except the pixel brush),
// tagged with the family they were built from (BuiltInBrushFactory). A
// right-click resize regenerates that family into a new instance, so this checks
// the tag rather than identity and a resized built-in still reads as built-in.
export function isBuiltInBrush(brush: unknown): boolean {
  return brush instanceof CustomBrush && brush.builtInFamily !== undefined;
}

// Reactive mirror of one brushSlots entry (docs/brush-slots.md Phase B). The
// class instance itself stays out of Overmind state, like brushRecall.
export type BrushSlotState = {
  occupied: boolean;
  thumbnail: string | null;
  // the brush's own pixel dimensions, captioned onto the thumbnail. A
  // scaled-to-fit thumbnail can't show actual size, and this is cheaper than
  // reading it back out of the rendered image
  size: { width: number; height: number } | null;
};

export type State = {
  // null for a custom brush, and for a right-click-resized built-in, which
  // matches no toolbar preset. So this tracks "which icon, if any, highlights",
  // not "is the current brush built-in". UsingBuiltInBrush is that, kept
  // separate precisely so the two can disagree.
  selectedBuiltInBrushId: BuiltInBrushId | null;
  // reactive mirror of isBuiltInBrush(brushRecall.current): drives Matte/ Repl
  // and the brush-transform menu items' disabled state. Stays true through a
  // right-click resize even though selectedBuiltInBrushId clears.
  usingBuiltInBrush: boolean;
  mode: Mode;
  // reactive mirror of brushRecall.originalBrush (the class itself is not
  // observable state): drives the Restore menu item's disabled state
  hasOriginalBrush: boolean;
  slots: BrushSlotState[];
  // mirror of brushRecall.previousBrush (docs/brush-slots.md): the
  // automatically-managed companion to the curated slots above
  previousSlot: BrushSlotState;
  // DPaint's Brush Handle: where a brush is held. 'center', or the corner its
  // pickup drag ended at (docs/brush-handle.md). One setting for the app, not
  // per brush, so changing it moves the brush already in hand — which is the
  // DPaint II behaviour, where DPaint I only read the flag at the next pickup.
  handleMode: HandleMode;
};

export const state: State = {
  selectedBuiltInBrushId: 1,
  usingBuiltInBrush: true,
  mode: 'Color',
  hasOriginalBrush: false,
  slots: Array.from({ length: BRUSH_SLOT_COUNT }, () => ({
    occupied: false,
    thumbnail: null,
    size: null,
  })),
  previousSlot: { occupied: false, thumbnail: null, size: null },
  handleMode: 'center',
};
