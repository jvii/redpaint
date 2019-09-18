import React from 'react';
import {
  ButtonFreehand,
  ButtonLine,
  ButtonFloodFill,
  ButtonCLR,
  ButtonZoom,
  ButtonUndo,
} from './toolBarButtons';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { FloodFillTool } from '../../tools/FloodFillTool';
import { PaletteState } from '../palette/PaletteState';
import { CanvasState } from '../canvas/CanvasState';
import { clearCanvas } from '../../tools/util';
import { useOvermind } from '../../overmind';
import './Toolbar.css';

export interface Props {
  canvasState: CanvasState;
  paletteState: PaletteState;
}

function Toolbar({ canvasState, paletteState }: Props): JSX.Element {
  const { state, actions } = useOvermind();
  return (
    <div className="ToolbarArea">
      <ButtonLine
        isSelected={state.toolbar.selectedTool instanceof LineTool}
        onClick={(): void => actions.toolbar.setSelectedTool(new LineTool())}
      />
      <ButtonFreehand
        isSelected={state.toolbar.selectedTool instanceof FreehandTool}
        onClick={(): void => actions.toolbar.setSelectedTool(new FreehandTool())}
      />
      <ButtonFloodFill
        isSelected={state.toolbar.selectedTool instanceof FloodFillTool}
        onClick={(): void => actions.toolbar.setSelectedTool(new FloodFillTool())}
      />
      <ButtonZoom
        isSelected={state.toolbar.zoomModeOn}
        onClick={(): void => actions.toolbar.toggleZoomMode()}
      />
      <ButtonUndo
        isSelected={false}
        onClick={(): void => actions.undo.undo()}
        onRightClick={(): void => actions.undo.redo()}
      />
      <ButtonCLR
        isSelected={false}
        onClick={(): void => {
          clearCanvas(canvasState.mainCanvas, paletteState.backgroundColor);
          actions.canvas.setCanvasModified(false);
          actions.undo.setUndoPoint(canvasState.mainCanvas);
        }}
      />
    </div>
  );
}

export default Toolbar;
