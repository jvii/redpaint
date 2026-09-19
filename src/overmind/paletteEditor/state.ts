import { Color } from '../../types';
import { PaletteRange } from '../palette/state';

export type State = {
  isOpen: boolean;
  // The slot being edited by the RGB/HSV sliders. Independent of the painting
  // foreground/background color, so opening the editor and clicking around its
  // palette grid never changes what you paint with.
  editedColorId: string;
  // Snapshots taken on open, restored by Cancel; null while closed.
  paletteSnapshot: { [id: string]: Color } | null;
  rangesSnapshot: (PaletteRange | null)[] | null;
  // Which of the 4 range slots is selected for editing; Set start/Set end
  // assign the currently edited color as that endpoint.
  activeRangeIndex: number | null;
  // An action awaiting a color pick: the next palette click completes it
  // against the currently edited color (DPaint's sticky Copy/Ex/Spread/ Range
  // modes), for 'range', selected color = start, clicked = end.
  armedAction: 'copy' | 'swap' | 'spread' | 'range' | null;
  // Shows the edited color alone on the picture, everything else dropped to the
  // background color. Reset on every open: state so the toggle can render from
  // it and so selectEditedColor knows whether to follow, not to be remembered.
  highlight: boolean;
  // The stencil's own view, suspended while the editor is open - it draws over
  // the picture the highlight is emptying - and put back on the way out.
  stencilVisibleBefore: boolean;
};

export const state: State = {
  isOpen: false,
  editedColorId: '1',
  paletteSnapshot: null,
  rangesSnapshot: null,
  activeRangeIndex: null,
  armedAction: null,
  highlight: false,
  stencilVisibleBefore: false,
};
