import { Context } from '../../overmind';
import { Color } from '../../types';
import { PaletteRange } from '../palette/state';

// proxy-state-tree rejects inserting an object reference that's already
// tracked at another path, so snapshotting/restoring always needs fresh
// copies — never the exact objects already living elsewhere in the tree.
function copyPalette(palette: { [id: string]: Color }): { [id: string]: Color } {
  const copy: { [id: string]: Color } = {};
  for (const id in palette) {
    copy[id] = { ...palette[id] };
  }
  return copy;
}

function copyRanges(ranges: (PaletteRange | null)[]): (PaletteRange | null)[] {
  return ranges.map((range) => (range ? { ...range } : null));
}

export const open = (context: Context): void => {
  context.state.paletteEditor.editedColorId = context.state.palette.foregroundColorId;
  context.state.paletteEditor.paletteSnapshot = copyPalette(context.state.palette.palette);
  context.state.paletteEditor.rangesSnapshot = copyRanges(context.state.palette.ranges);
  context.state.paletteEditor.activeRangeIndex = null;
  context.state.paletteEditor.armedAction = null;
  context.state.paletteEditor.isOpen = true;
};

// Keep the live edits; just close.
export const close = (context: Context): void => {
  context.state.paletteEditor.isOpen = false;
  context.state.paletteEditor.paletteSnapshot = null;
  context.state.paletteEditor.rangesSnapshot = null;
};

// Restore the palette and ranges to how they were when the editor opened.
export const cancel = (context: Context): void => {
  const { paletteSnapshot, rangesSnapshot } = context.state.paletteEditor;
  if (paletteSnapshot) {
    context.state.palette.palette = copyPalette(paletteSnapshot);
  }
  if (rangesSnapshot) {
    context.state.palette.ranges = copyRanges(rangesSnapshot);
  }
  context.actions.paletteEditor.close();
};

export const selectEditedColor = (context: Context, colorId: string): void => {
  // an armed two-color action completes on this click, applied between the
  // currently edited color and the clicked one; the clicked color becomes
  // the selection either way (like DPaint)
  const armed = context.state.paletteEditor.armedAction;
  if (armed === 'copy') {
    context.actions.palette.copyColor({
      fromId: context.state.paletteEditor.editedColorId,
      toId: colorId,
    });
  } else if (armed === 'swap') {
    context.actions.palette.swapColors({
      aId: context.state.paletteEditor.editedColorId,
      bId: colorId,
    });
  } else if (armed === 'spread') {
    context.actions.palette.spread({
      fromId: context.state.paletteEditor.editedColorId,
      toId: colorId,
    });
  } else if (armed === 'rangeStart' || armed === 'rangeEnd') {
    const rangeIndex = context.state.paletteEditor.activeRangeIndex;
    if (rangeIndex !== null) {
      const existing = context.state.palette.ranges[rangeIndex];
      context.actions.palette.setRange({
        rangeIndex,
        start: armed === 'rangeStart' ? colorId : (existing?.start ?? colorId),
        end: armed === 'rangeEnd' ? colorId : (existing?.end ?? colorId),
      });
    }
  }
  context.state.paletteEditor.armedAction = null;
  context.state.paletteEditor.editedColorId = colorId;
};

// Arms a two-color action (or disarms it when it's already armed — the
// button doubles as its own cancel). Arming one action replaces the other.
export const armAction = (
  context: Context,
  action: 'copy' | 'swap' | 'spread' | 'rangeStart' | 'rangeEnd'
): void => {
  context.state.paletteEditor.armedAction =
    context.state.paletteEditor.armedAction === action ? null : action;
};

export const selectRange = (context: Context, rangeIndex: number): void => {
  context.state.paletteEditor.activeRangeIndex = rangeIndex;
  // a pending endpoint pick was for the previously selected slot
  if (
    context.state.paletteEditor.armedAction === 'rangeStart' ||
    context.state.paletteEditor.armedAction === 'rangeEnd'
  ) {
    context.state.paletteEditor.armedAction = null;
  }
};

export const clearActiveRange = (context: Context): void => {
  const { activeRangeIndex } = context.state.paletteEditor;
  if (activeRangeIndex === null) {
    return;
  }
  context.actions.palette.clearRange(activeRangeIndex);
};
