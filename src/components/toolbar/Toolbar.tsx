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
import { Action, ToolbarState } from './ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { CanvasState } from '../canvas/CanvasState';
import { UndoStateAction } from '../canvas/UndoState';
import { clearCanvas } from '../../tools/util';
import './Toolbar.css';

export interface Props {
  toolbarDispatch: React.Dispatch<Action>;
  toolbarState: ToolbarState;
  canvasState: CanvasState;
  paletteState: PaletteState;
  undoDispatch: React.Dispatch<UndoStateAction>;
}

function Toolbar({
  toolbarDispatch,
  toolbarState,
  canvasState,
  paletteState,
  undoDispatch,
}: Props): JSX.Element {
  return (
    <div className="ToolbarArea">
      <ButtonLine
        isSelected={toolbarState.selectedTool instanceof LineTool}
        onClick={(): void => toolbarDispatch({ type: 'setSelectedTool', tool: new LineTool() })}
      />
      <ButtonFreehand
        isSelected={toolbarState.selectedTool instanceof FreehandTool}
        onClick={(): void => toolbarDispatch({ type: 'setSelectedTool', tool: new FreehandTool() })}
      />
      <ButtonFloodFill
        isSelected={toolbarState.selectedTool instanceof FloodFillTool}
        onClick={(): void =>
          toolbarDispatch({ type: 'setSelectedTool', tool: new FloodFillTool() })
        }
      />
      <ButtonZoom
        isSelected={toolbarState.zoomModeOn}
        onClick={(): void =>
          toolbarDispatch({ type: 'zoomModeOn', on: toolbarState.zoomModeOn ? false : true })
        }
      />
      <ButtonUndo
        isSelected={false}
        onClick={(): void => {
          undoDispatch({ type: 'undo' });
        }}
        onRightClick={(): void => {
          undoDispatch({ type: 'redo' });
        }}
      />
      <ButtonCLR
        isSelected={false}
        onClick={(): void => {
          clearCanvas(canvasState.mainCanvasRef, paletteState.backgroundColor);
          clearCanvas(canvasState.zoomCanvasRef, paletteState.backgroundColor);
        }}
      />
    </div>
  );
}

export default Toolbar;
