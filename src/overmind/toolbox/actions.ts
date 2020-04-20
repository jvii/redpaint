import { Action } from 'overmind';
import { DrawingToolId } from './state';

export const setSelectedDrawingTool: Action<DrawingToolId> = ({ state, actions }, toolId): void => {
  actions.toolbox.setActiveToPreviousTool();
  state.toolbox.selectedDrawingToolId = toolId;
  state.toolbox.selectedSelectorToolId = null;
};

export const toggleZoomMode: Action = ({ state, actions }): void => {
  actions.toolbox.setActiveToPreviousTool();
  const isSelected = state.toolbox.zoomModeOn;
  if (isSelected) {
    state.toolbox.zoomModeOn = false;
  } else {
    state.toolbox.selectedSelectorToolId = 'zoomInitialPointSelectorTool';
  }
  actions.canvas.setZoomFocusPoint(null);
};

export const toggleBrushSelectionMode: Action = ({ state, actions }): void => {
  actions.toolbox.setActiveToPreviousTool();
  const isSelected = state.toolbox.selectedSelectorToolId === 'brushSelectorTool';
  state.toolbox.selectedSelectorToolId = isSelected ? null : 'brushSelectorTool';
};

export const toggleForegroundColorSelectionMode: Action = ({ state, actions }): void => {
  actions.toolbox.setActiveToPreviousTool();
  const isSelected = state.toolbox.selectedSelectorToolId === 'foregroundColorSelectorTool';
  state.toolbox.selectedSelectorToolId = isSelected ? null : 'foregroundColorSelectorTool';
};

export const toggleBackgroundColorSelectionMode: Action = ({ state, actions }): void => {
  actions.toolbox.setActiveToPreviousTool();
  const isSelected = state.toolbox.selectedSelectorToolId === 'backgroundColorSelectorTool';
  state.toolbox.selectedSelectorToolId = isSelected ? null : 'backgroundColorSelectorTool';
};

export const toggleSymmetryMode: Action = ({ state }): void => {
  const isSelected = state.toolbox.symmetryModeOn;
  state.toolbox.symmetryModeOn = isSelected ? false : true;
  state.toolbox.selectedSelectorToolId = null;
};

export const setActiveToPreviousTool: Action = ({ state }): void => {
  state.toolbox.previousToolId = state.toolbox.activeToolId;
};
