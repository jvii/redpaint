import { Action } from 'overmind';

export const setSelectedTool: Action<string> = ({ state }, toolId): void => {
  state.toolbar.selectedToolId = toolId;
  state.toolbar.brushSelectionOn = false;
};

export const toggleZoomMode: Action = ({ state, actions }): void => {
  if (state.toolbar.brushSelectionOn) {
    state.toolbar.brushSelectionOn = false;
  }
  const wasOn = state.toolbar.zoomModeOn;
  state.toolbar.zoomModeOn = wasOn ? false : true;
  state.toolbar.selectionInProcess = wasOn ? false : true;
  actions.canvas.setZoomFocusPoint(null);
};

export const toggleBrushSelectionMode: Action = ({ state }): void => {
  const wasOn = state.toolbar.brushSelectionOn;
  state.toolbar.brushSelectionOn = wasOn ? false : true;
  if (state.toolbar.zoomModeOn && !wasOn && state.toolbar.selectionInProcess) {
    state.toolbar.zoomModeOn = false;
  }
  state.toolbar.selectionInProcess = wasOn ? false : true;
};

export const setSelectionComplete: Action = ({ state, actions }): void => {
  state.toolbar.selectionInProcess = false;
  state.toolbar.brushSelectionOn = false;
  actions.toolbar.setSelectedTool('freeHandTool');
};

export const selectBuiltInBrush: Action<number> = ({ state, actions }, brushNumber): void => {
  state.toolbar.selectedBuiltInBrush = brushNumber;
  if (brushNumber === 0) {
    return;
  }
  actions.brush.setBrush(state.brush.builtInBrushes[brushNumber]);
};
