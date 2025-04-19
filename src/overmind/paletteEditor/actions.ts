import { Context } from '../../overmind'

export const close = (context: Context): void => {
  context.state.paletteEditor.isOpen = false;
};

export const open = (context: Context): void => {
  context.state.paletteEditor.isOpen = true;
};
