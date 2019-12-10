import React from 'react';
import { ToolbarToggleButton } from './ToolbarToggleButton';
import { ToolbarDualToggleButton } from './ToolbarDualToggleButton';
import { ToolbarActionButton } from './ToolbarActionButton';
import { BuiltInBrushes } from './BuiltInBrushes';
import { CanvasState } from '../canvas/CanvasState';
import { clearCanvas } from '../../tools/util';
import { useOvermind } from '../../overmind';
import './Toolbar.css';

export interface Props {
  canvasState: CanvasState;
}

function Toolbar({ canvasState }: Props): JSX.Element {
  const { state, actions } = useOvermind();
  return (
    <div>
      <BuiltInBrushes />
      <div className="ToolbarArea">
        <ToolbarToggleButton
          buttonClass="Line"
          isSelected={state.toolbar.selectedToolId === 'lineTool'}
          onClick={(): void => actions.toolbar.setSelectedTool('lineTool')}
        />
        <ToolbarToggleButton
          buttonClass="Freehand"
          isSelected={state.toolbar.selectedToolId === 'freeHandTool'}
          onClick={(): void => actions.toolbar.setSelectedTool('freeHandTool')}
        />
        <ToolbarDualToggleButton
          buttonClass="Rectangle"
          isUpperHalfSelected={state.toolbar.selectedToolId === 'rectangleNoFillTool'}
          isLowerHalfSelected={state.toolbar.selectedToolId === 'rectangleFilledTool'}
          onUpperHalfClick={(): void => actions.toolbar.setSelectedTool('rectangleNoFillTool')}
          onLowerHalfClick={(): void => actions.toolbar.setSelectedTool('rectangleFilledTool')}
        />
        <ToolbarToggleButton
          buttonClass="FloodFill"
          isSelected={state.toolbar.selectedToolId === 'floodFillTool'}
          onClick={(): void => actions.toolbar.setSelectedTool('floodFillTool')}
        />
        <ToolbarToggleButton
          buttonClass="Zoom"
          isSelected={state.toolbar.zoomModeOn}
          onClick={(): void => actions.toolbar.toggleZoomMode()}
        />
        <ToolbarToggleButton
          buttonClass="BrushSelect"
          isSelected={state.toolbar.brushSelectionOn}
          onClick={(): void => actions.toolbar.toggleBrushSelectionMode()}
        />
        <ToolbarActionButton
          buttonClass="Undo"
          onClick={(): void => actions.undo.undo()}
          onRightClick={(): void => actions.undo.redo()}
        />
        <ToolbarActionButton
          buttonClass="CLR"
          onClick={(): void => {
            clearCanvas(canvasState.mainCanvas, state.palette.backgroundColor);
            actions.canvas.setCanvasModified(false);
            actions.undo.setUndoPoint(canvasState.mainCanvas);
          }}
        />
      </div>
    </div>
  );
}

export default Toolbar;
