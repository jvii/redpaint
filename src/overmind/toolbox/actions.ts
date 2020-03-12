import { Action } from 'overmind';
import { DrawingToolId } from './state';

export const setSelectedDrawingTool: Action<DrawingToolId> = ({ state }, toolId): void => {
  state.toolbox.selectedDrawingToolId = toolId;
  state.toolbox.brushSelectionModeOn = false;
};

export const toggleZoomMode: Action = ({ state, actions }): void => {
  const oldState = state.toolbox.zoomModeState;
  switch (oldState) {
    case 'off':
      state.toolbox.zoomModeState = 'selectingInitialPoint';
      state.toolbox.brushSelectionModeOn = false; // can't be selecting brush while selecting zoom point
      state.toolbox.symmetryModeOn = false;
      break;
    case 'selectingInitialPoint':
      state.toolbox.zoomModeState = 'off';
      break;
    case 'on':
      state.toolbox.zoomModeState = 'off';
      break;
  }

  actions.canvas.setZoomFocusPoint(null);
};

export const toggleBrushSelectionMode: Action = ({ state }): void => {
  const oldState = state.toolbox.brushSelectionModeOn;
  state.toolbox.brushSelectionModeOn = oldState ? false : true;

  if (state.toolbox.zoomModeState === 'selectingInitialPoint') {
    state.toolbox.zoomModeState = 'off'; // can't be selecting zoom point while selecting brush
  }

  state.toolbox.symmetryModeOn = false;
};

export const toggleSymmetryMode: Action = ({ state }): void => {
  const oldState = state.toolbox.symmetryModeOn;
  state.toolbox.symmetryModeOn = oldState ? false : true;
  state.toolbox.brushSelectionModeOn = false;
};
