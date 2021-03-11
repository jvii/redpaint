import React from 'react';
import { ToolboxToggleButton } from './buttons/ToolboxToggleButton';
import { ToolboxDualToggleButton } from './buttons/ToolboxDualToggleButton';
import { ToolboxActionButton } from './buttons/ToolboxActionButton';
import { CanvasState } from '../canvas/CanvasState';
import { clearCanvas } from '../../tools/util/util';
import { useOvermind } from '../../overmind';
import './Toolbox.css';

export interface Props {
  canvasState: CanvasState;
}

export function Toolbox({ canvasState }: Props): JSX.Element {
  const { state, actions } = useOvermind();
  return (
    <div className="toolbox">
      <ToolboxToggleButton
        buttonClass="dottedfreehand"
        isSelected={state.toolbox.selectedDrawingToolId === 'dottedFreehand'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('dottedFreehand')}
      />
      <ToolboxToggleButton
        buttonClass="freehand"
        isSelected={state.toolbox.selectedDrawingToolId === 'freeHand'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('freeHand')}
      />
      <ToolboxToggleButton
        buttonClass="line"
        isSelected={state.toolbox.selectedDrawingToolId === 'line'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('line')}
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
      <ToolboxToggleButton
        buttonClass="airbrush"
        isSelected={state.toolbox.selectedDrawingToolId === 'airbrush'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('airbrush')}
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
      <ToolboxDualToggleButton
        buttonClass="polygon"
        isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'polygonNoFill'}
        isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'polygonFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('polygonNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('polygonFilled')}
      />
      <ToolboxToggleButton
        buttonClass="brushselect"
        isSelected={state.toolbox.activeToolId === 'brushSelectorTool'}
        onClick={(): void => actions.toolbox.toggleBrushSelectionMode()}
      />
      <ToolboxDualToggleButton
        buttonClass="text"
        isUpperHalfSelected={state.toolbox.selectedDrawingToolId === 'textNoFill'}
        isLowerHalfSelected={state.toolbox.selectedDrawingToolId === 'textFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('textNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('textFilled')}
      />
      <ToolboxToggleButton
        buttonClass="zoom"
        isSelected={
          state.toolbox.zoomModeOn || state.toolbox.activeToolId === 'zoomInitialPointSelectorTool'
        }
        onClick={(): void => actions.toolbox.toggleZoomMode()}
      />
      <ToolboxToggleButton
        buttonClass="symmetry"
        isSelected={state.toolbox.symmetryModeOn}
        onClick={(): void => actions.toolbox.toggleSymmetryMode()}
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
          //resetIndex();
          actions.undo.setUndoPoint(canvasState.mainCanvas);
        }}
      />
    </div>
  );
}
