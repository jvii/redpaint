import React from 'react';
import {
  ButtonFreehand,
  ButtonLine,
  ButtonRectangle,
  ButtonFloodFill,
  ButtonCLR,
  ButtonZoom,
  ButtonBrushSelect,
  ButtonUndo,
} from './toolBarButtons';
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
        <ButtonLine
          isSelected={state.toolbar.selectedTool instanceof LineTool}
          onClick={(): void => actions.toolbar.setSelectedTool('lineTool')}
        />
        <ButtonFreehand
          isSelected={state.toolbar.selectedTool instanceof FreehandTool}
          onClick={(): void => actions.toolbar.setSelectedTool('freeHandTool')}
        />
        <ButtonRectangle
          isSelected={state.toolbar.selectedTool instanceof LineTool}
          onLowerHalfClick={(): void => actions.toolbar.setSelectedTool('lineTool')}
        />
        <ButtonFloodFill
          isSelected={state.toolbar.selectedTool instanceof FloodFillTool}
          onClick={(): void => actions.toolbar.setSelectedTool('floodFillTool')}
        />
        <ButtonZoom
          isSelected={state.toolbar.zoomModeOn}
          onClick={(): void => actions.toolbar.toggleZoomMode()}
        />
        <ButtonBrushSelect
          isSelected={state.toolbar.brushSelectionOn}
          onClick={(): void => actions.toolbar.toggleBrushSelectionMode()}
        />
        <ButtonUndo
          isSelected={false}
          onClick={(): void => actions.undo.undo()}
          onRightClick={(): void => actions.undo.redo()}
        />
        <ButtonCLR
          isSelected={false}
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
