import { Action } from 'overmind';

export const setSelectedTool: Action<string> = ({ state }, toolId): void => {
  state.toolbar.selectedToolId = toolId;
};

export const toggleZoomMode: Action = ({ state, actions }): void => {
  const wasOn = state.toolbar.zoomModeOn;
  state.toolbar.zoomModeOn = wasOn ? false : true;
  state.toolbar.selectionInProcess = wasOn ? false : true;
  actions.canvas.setZoomFocusPoint(null);
};

export const toggleBrushSelectionMode: Action = ({ state }): void => {
  const wasOn = state.toolbar.brushSelectionOn;
  state.toolbar.brushSelectionOn = wasOn ? false : true;
  state.toolbar.selectionInProcess = wasOn ? false : true;
};

export const setSelectionComplete: Action = ({ state }): void => {
  state.toolbar.selectionInProcess = false;
  state.toolbar.brushSelectionOn = false;
};

export const selectBuiltInBrush: Action<number> = ({ state }, brushNumber): void => {
  state.toolbar.selectedBuiltInBrush = brushNumber;
};
