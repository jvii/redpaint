import { Action } from 'overmind';

export const close: Action = ({ state }): void => {
  state.paletteEditor.isOpen = false;
};

export const open: Action = ({ state }): void => {
  state.paletteEditor.isOpen = true;
};
