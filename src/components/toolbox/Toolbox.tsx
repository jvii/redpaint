import React from 'react';
import { ToolboxToggleButton } from './buttons/ToolboxToggleButton';
import { ToolboxDualToggleButton } from './buttons/ToolboxDualToggleButton';
import { ToolboxActionButton } from './buttons/ToolboxActionButton';
import { BuiltInBrushes } from './BuiltInBrushes';
import { CanvasState } from '../canvas/CanvasState';
import { clearCanvas } from '../../tools/util';
import { useOvermind } from '../../overmind';
import './Toolbox.css';

export interface Props {
  canvasState: CanvasState;
}

export function Toolbox({ canvasState }: Props): JSX.Element {
  const { state, actions } = useOvermind();
  return (
    <div>
      <BuiltInBrushes />
      <div className="ToolboxArea">
        <ToolboxToggleButton
          buttonClass="Line"
          isSelected={state.toolbox.selectedDrawingToolId === 'line'}
          onClick={(): void => actions.toolbox.setSelectedDrawingTool('line')}
        />
        <ToolboxToggleButton
          buttonClass="Freehand"
          isSelected={state.toolbox.selectedDrawingToolId === 'freeHand'}
          onClick={(): void => actions.toolbox.setSelectedDrawingTool('freeHand')}
        />
        <ToolboxToggleButton
          buttonClass="Curve"
          isSelected={state.toolbox.selectedDrawingToolId === 'curve'}
          onClick={(): void => actions.toolbox.setSelectedDrawingTool('curve')}
        />
        <ToolboxToggleButton
          buttonClass="FloodFill"
          isSelected={state.toolbox.selectedDrawingToolId === 'floodFill'}
          onClick={(): void => actions.toolbox.setSelectedDrawingTool('floodFill')}
        />
        <ToolboxDualToggleButton
          buttonClass="Rectangle"
          isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'rectangleNoFill'}
          isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'rectangleFilled'}
          onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('rectangleNoFill')}
          onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('rectangleFilled')}
        />
        <ToolboxDualToggleButton
          buttonClass="Circle"
          isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'circleNoFill'}
          isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'circleFilled'}
          onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('circleNoFill')}
          onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('circleFilled')}
        />
        <ToolboxDualToggleButton
          buttonClass="Ellipse"
          isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'ellipseNoFill'}
          isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'ellipseFilled'}
          onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('ellipseNoFill')}
          onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('ellipseFilled')}
        />
        <ToolboxToggleButton
          buttonClass="Symmetry"
          isSelected={state.toolbox.symmetryModeOn}
          onClick={(): void => actions.toolbox.toggleSymmetryMode()}
        />
        <ToolboxToggleButton
          buttonClass="Zoom"
          isSelected={state.toolbox.zoomModeState !== 'off'}
          onClick={(): void => actions.toolbox.toggleZoomMode()}
        />
        <ToolboxToggleButton
          buttonClass="BrushSelect"
          isSelected={state.toolbox.brushSelectionModeOn}
          onClick={(): void => actions.toolbox.toggleBrushSelectionMode()}
        />
        <ToolboxActionButton
          buttonClass="Undo"
          onClick={(): void => actions.undo.undo()}
          onRightClick={(): void => actions.undo.redo()}
        />
        <ToolboxActionButton
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
