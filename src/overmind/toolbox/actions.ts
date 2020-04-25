import { Action } from 'overmind';
import { DrawingToolId } from './state';

export const setSelectedDrawingTool: Action<DrawingToolId> = ({ state, actions }, toolId): void => {
  actions.toolbox.setActiveToPreviousTool();
  state.toolbox.selectedDrawingToolId = toolId;
  state.toolbox.selectedSelectorToolId = null;
};

export const toggleZoomMode: Action = ({ state, actions }): void => {
  actions.toolbox.setActiveToPreviousTool();
  actions.canvas.setZoomFocusPoint(null);
  // ZoomMode on => ZoomMode off
  if (state.toolbox.zoomModeOn) {
    state.toolbox.zoomModeOn = false;
    return;
  }
  // ZoomMode not yet on and selecting zoom initial point => exit initial point selection
  if (state.toolbox.selectedSelectorToolId === 'zoomInitialPointSelectorTool') {
    state.toolbox.selectedSelectorToolId = null;
    return;
  }
  // ZoomMode not on and not selecting zoom initial point => start initial point selection
  state.toolbox.selectedSelectorToolId = 'zoomInitialPointSelectorTool';
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
