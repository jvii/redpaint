import { Context } from '../../overmind'

export const open = (context: Context, dialogId: string): void => {
  context.state.dialog.activeDialog = dialogId;
};

export const close = (context: Context): void => {
  context.state.dialog.activeDialog = '';
};
