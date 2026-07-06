import { Color } from '../../types';
import { PaletteRange } from '../palette/state';

export type State = {
  isOpen: boolean;
  // The slot being edited by the RGB/HSV sliders — independent of the
  // painting foreground/background color, so opening the editor and
  // clicking around its palette grid never changes what you paint with.
  editedColorId: string;
  // Snapshots taken on open, restored by Cancel; null while closed.
  paletteSnapshot: { [id: string]: Color } | null;
  rangesSnapshot: (PaletteRange | null)[] | null;
  // Which of the 4 range slots is selected for editing, and which endpoint
  // the next palette-grid click will set (DPaint's drag-the-bracket
  // interaction, done as two explicit clicks instead).
  activeRangeIndex: number | null;
  armedEndpoint: 'start' | 'end' | null;
};

export const state: State = {
  isOpen: false,
  editedColorId: '1',
  paletteSnapshot: null,
  rangesSnapshot: null,
  activeRangeIndex: null,
  armedEndpoint: null,
};
