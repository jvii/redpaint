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
  context.state.paletteEditor.armedEndpoint = null;
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
  const { activeRangeIndex, armedEndpoint } = context.state.paletteEditor;
  if (activeRangeIndex !== null && armedEndpoint !== null) {
    const existing = context.state.palette.ranges[activeRangeIndex];
    context.actions.palette.setRange({
      rangeIndex: activeRangeIndex,
      start: armedEndpoint === 'start' ? colorId : (existing?.start ?? colorId),
      end: armedEndpoint === 'end' ? colorId : (existing?.end ?? colorId),
    });
    context.state.paletteEditor.armedEndpoint = null;
    return;
  }
  context.state.paletteEditor.editedColorId = colorId;
};

export const selectRange = (context: Context, rangeIndex: number): void => {
  context.state.paletteEditor.activeRangeIndex = rangeIndex;
  context.state.paletteEditor.armedEndpoint = null;
};

export const armEndpoint = (context: Context, endpoint: 'start' | 'end'): void => {
  context.state.paletteEditor.armedEndpoint = endpoint;
};

export const clearActiveRange = (context: Context): void => {
  const { activeRangeIndex } = context.state.paletteEditor;
  if (activeRangeIndex === null) {
    return;
  }
  context.actions.palette.clearRange(activeRangeIndex);
  context.state.paletteEditor.armedEndpoint = null;
};
