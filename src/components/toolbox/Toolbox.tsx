import React from 'react';
import { ToolboxToggleButton } from './buttons/ToolboxToggleButton';
import { ToolboxDualToggleButton } from './buttons/ToolboxDualToggleButton';
import { ToolboxActionButton } from './buttons/ToolboxActionButton';
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
    <div className="toolbox-area">
      <ToolboxToggleButton
        buttonClass="line"
        isSelected={state.toolbox.selectedDrawingToolId === 'line'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('line')}
      />
      <ToolboxToggleButton
        buttonClass="freehand"
        isSelected={state.toolbox.selectedDrawingToolId === 'freeHand'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('freeHand')}
      />
      <ToolboxToggleButton
        buttonClass="curve"
        isSelected={state.toolbox.selectedDrawingToolId === 'curve'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('curve')}
      />
      <ToolboxToggleButton
        buttonClass="floodfill"
        isSelected={state.toolbox.selectedDrawingToolId === 'floodFill'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('floodFill')}
      />
      <ToolboxDualToggleButton
        buttonClass="rectangle"
        isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'rectangleNoFill'}
        isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'rectangleFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('rectangleNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('rectangleFilled')}
      />
      <ToolboxDualToggleButton
        buttonClass="circle"
        isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'circleNoFill'}
        isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'circleFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('circleNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('circleFilled')}
      />
      <ToolboxDualToggleButton
        buttonClass="ellipse"
        isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'ellipseNoFill'}
        isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'ellipseFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('ellipseNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('ellipseFilled')}
      />
      <ToolboxToggleButton
        buttonClass="symmetry"
        isSelected={state.toolbox.symmetryModeOn}
        onClick={(): void => actions.toolbox.toggleSymmetryMode()}
      />
      <ToolboxToggleButton
        buttonClass="zoom"
        isSelected={state.toolbox.zoomModeState !== 'off'}
        onClick={(): void => actions.toolbox.toggleZoomMode()}
      />
      <ToolboxToggleButton
        buttonClass="brushselect"
        isSelected={state.toolbox.brushSelectionModeOn}
        onClick={(): void => actions.toolbox.toggleBrushSelectionMode()}
      />
      <ToolboxActionButton
        buttonClass="undo"
        onClick={(): void => actions.undo.undo()}
        onRightClick={(): void => actions.undo.redo()}
      />
      <ToolboxActionButton
        buttonClass="clr"
        onClick={(): void => {
          clearCanvas(canvasState.mainCanvas, state.palette.backgroundColor);
          actions.canvas.setCanvasModified(false);
          actions.undo.setUndoPoint(canvasState.mainCanvas);
        }}
      />
    </div>
  );
}
