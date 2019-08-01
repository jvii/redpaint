import React from 'react';
import {
  ButtonFreehand,
  ButtonLine,
  ButtonFloodFill,
  ButtonCLR,
  ButtonZoom,
} from './toolBarButtons';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { FloodFillTool } from '../../tools/FloodFillTool';
import { Action, ToolbarState } from './ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { CanvasState } from '../canvas/CanvasState';
import { clearCanvas } from '../../tools/util';
import './Toolbar.css';

export interface Props {
  toolbarDispatch: React.Dispatch<Action>;
  toolbarState: ToolbarState;
  canvasState: CanvasState;
  paletteState: PaletteState;
}

function Toolbar({ toolbarDispatch, toolbarState, canvasState, paletteState }: Props): JSX.Element {
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
      <ButtonCLR
        isSelected={false}
        onClick={(): void => {
          if (canvasState.mainCanvasRef === null) {
            return;
          }
          clearCanvas(canvasState.mainCanvasRef.current, paletteState.backgroundColor);
          if (canvasState.zoomCanvasRef === null) {
            return;
          }
          clearCanvas(canvasState.zoomCanvasRef.current, paletteState.backgroundColor);
        }}
      />
      <ButtonZoom
        isSelected={toolbarState.zoomModeOn}
        onClick={(): void =>
          toolbarDispatch({ type: 'zoomModeOn', on: toolbarState.zoomModeOn ? false : true })
        }
      />
    </div>
  );
}

export default Toolbar;
