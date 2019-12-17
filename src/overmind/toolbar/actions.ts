import { Action } from 'overmind';
import { DrawingToolId } from './state';

export const setSelectedDrawingTool: Action<DrawingToolId> = ({ state }, toolId): void => {
  state.toolbar.selectedDrawingToolId = toolId;
  state.toolbar.brushSelectionModeOn = false;
};

export const toggleZoomMode: Action = ({ state, actions }): void => {
  const oldState = state.toolbar.zoomModeState;
  switch (oldState) {
    case 'off':
      state.toolbar.zoomModeState = 'selectingInitialPoint';
      break;
    case 'selectingInitialPoint':
      state.toolbar.zoomModeState = 'off';
      break;
    case 'on':
      state.toolbar.zoomModeState = 'off';
      break;
  }

  state.toolbar.brushSelectionModeOn = false;
  actions.canvas.setZoomFocusPoint(null);
};

export const toggleBrushSelectionMode: Action = ({ state }): void => {
  const oldState = state.toolbar.brushSelectionModeOn;
  state.toolbar.brushSelectionModeOn = oldState ? false : true;

  // deselect zoom mode if selecting zoom mode initial point in process
  if (state.toolbar.zoomModeState === 'selectingInitialPoint') {
    state.toolbar.zoomModeState = 'off';
  }
};
