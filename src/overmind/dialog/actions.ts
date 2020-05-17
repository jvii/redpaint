import { Action } from 'overmind';

export const open: Action<string> = ({ state }, dialogId): void => {
  state.dialog.activeDialog = dialogId;
};

export const close: Action = ({ state }): void => {
  state.dialog.activeDialog = '';
};
