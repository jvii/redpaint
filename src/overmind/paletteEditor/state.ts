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
  // Which of the 4 range slots is selected for editing; Set start/Set end
  // assign the currently edited color as that endpoint.
  activeRangeIndex: number | null;
  // An action awaiting a color pick: the next palette click completes it
  // against the currently edited color (DPaint's sticky Copy/Ex/Spread/
  // Range modes) — for 'range', selected color = start, clicked = end.
  armedAction: 'copy' | 'swap' | 'spread' | 'range' | null;
};

export const state: State = {
  isOpen: false,
  editedColorId: '1',
  paletteSnapshot: null,
  rangesSnapshot: null,
  activeRangeIndex: null,
  armedAction: null,
};
