import React from 'react';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarButtonUnselectable } from './ToolbarButtonUnselectable';
import { ToolbarButtonDivided } from '././ToolbarButtonDivided';
import { BuiltInBrushes } from './BuiltInBrushes';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { FloodFillTool } from '../../tools/FloodFillTool';
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
        <ToolbarButton
          buttonClass="Line"
          isSelected={state.toolbar.selectedTool instanceof LineTool}
          onClick={(): void => actions.toolbar.setSelectedTool('lineTool')}
        />
        <ToolbarButton
          buttonClass="Freehand"
          isSelected={state.toolbar.selectedTool instanceof FreehandTool}
          onClick={(): void => actions.toolbar.setSelectedTool('freeHandTool')}
        />
        <ToolbarButtonDivided
          buttonClass="Rectangle"
          isUpperHalfSelected={state.toolbar.selectedToolId === 'rectangleNoFillTool'}
          isLowerHalfSelected={state.toolbar.selectedToolId === 'rectangleFilledTool'}
          onUpperHalfClick={(): void => actions.toolbar.setSelectedTool('rectangleNoFillTool')}
          onLowerHalfClick={(): void => actions.toolbar.setSelectedTool('rectangleFilledTool')}
        />
        <ToolbarButton
          buttonClass="FloodFill"
          isSelected={state.toolbar.selectedTool instanceof FloodFillTool}
          onClick={(): void => actions.toolbar.setSelectedTool('floodFillTool')}
        />
        <ToolbarButton
          buttonClass="Zoom"
          isSelected={state.toolbar.zoomModeOn}
          onClick={(): void => actions.toolbar.toggleZoomMode()}
        />
        <ToolbarButton
          buttonClass="BrushSelect"
          isSelected={state.toolbar.brushSelectionOn}
          onClick={(): void => actions.toolbar.toggleBrushSelectionMode()}
        />
        <ToolbarButtonUnselectable
          buttonClass="Undo"
          onClick={(): void => actions.undo.undo()}
          onRightClick={(): void => actions.undo.redo()}
        />
        <ToolbarButtonUnselectable
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
