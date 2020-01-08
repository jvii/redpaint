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
          isSelected={state.toolbar.selectedDrawingToolId === 'line'}
          onClick={(): void => actions.toolbar.setSelectedDrawingTool('line')}
        />
        <ToolbarToggleButton
          buttonClass="Freehand"
          isSelected={state.toolbar.selectedDrawingToolId === 'freeHand'}
          onClick={(): void => actions.toolbar.setSelectedDrawingTool('freeHand')}
        />
        <ToolbarDualToggleButton
          buttonClass="Rectangle"
          isUpperHalfSelected={state.toolbar.selectedDrawingToolId === 'rectangleNoFill'}
          isLowerHalfSelected={state.toolbar.selectedDrawingToolId === 'rectangleFilled'}
          onUpperHalfClick={(): void => actions.toolbar.setSelectedDrawingTool('rectangleNoFill')}
          onLowerHalfClick={(): void => actions.toolbar.setSelectedDrawingTool('rectangleFilled')}
        />
        <ToolbarDualToggleButton
          buttonClass="Circle"
          isUpperHalfSelected={state.toolbar.selectedDrawingToolId === 'circleNoFill'}
          isLowerHalfSelected={state.toolbar.selectedDrawingToolId === 'circleFilled'}
          onUpperHalfClick={(): void => actions.toolbar.setSelectedDrawingTool('circleNoFill')}
          onLowerHalfClick={(): void => actions.toolbar.setSelectedDrawingTool('circleFilled')}
        />
        <ToolbarToggleButton
          buttonClass="FloodFill"
          isSelected={state.toolbar.selectedDrawingToolId === 'floodFill'}
          onClick={(): void => actions.toolbar.setSelectedDrawingTool('floodFill')}
        />
        <ToolbarToggleButton
          buttonClass="Symmetry"
          isSelected={state.toolbar.symmetryModeOn}
          onClick={(): void => actions.toolbar.toggleSymmetryMode()}
        />
        <ToolbarToggleButton
          buttonClass="Zoom"
          isSelected={state.toolbar.zoomModeState !== 'off'}
          onClick={(): void => actions.toolbar.toggleZoomMode()}
        />
        <ToolbarToggleButton
          buttonClass="BrushSelect"
          isSelected={state.toolbar.brushSelectionModeOn}
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
