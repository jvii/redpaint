import React from 'react';
import { ButtonFreehand, ButtonLine, ButtonCLR } from './toolBarButtons';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { Action } from './ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { CanvasState } from '../canvas/CanvasState';
import { clearCanvas } from '../../tools/util';
import './Toolbar.css';

export interface Props {
  dispatch: React.Dispatch<Action>;
  canvasState: CanvasState;
  paletteState: PaletteState;
}

function Toolbar({ dispatch, canvasState, paletteState }: Props): JSX.Element {
  return (
    <div className="ToolbarArea">
      <ButtonLine
        onClick={(): void => dispatch({ type: 'setSelectedTool', tool: new LineTool() })}
      />
      <ButtonFreehand
        onClick={(): void => dispatch({ type: 'setSelectedTool', tool: new FreehandTool() })}
      />
      <ButtonCLR
        onClick={(): void => {
          if (canvasState.canvasRef === null) {
            return;
          }
          clearCanvas(canvasState.canvasRef.current, paletteState.backgroundColor);
        }}
      />
    </div>
  );
}

export default Toolbar;
