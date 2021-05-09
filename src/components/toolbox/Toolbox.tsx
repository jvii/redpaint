import React from 'react';
import { ToolboxToggleButton } from './buttons/ToolboxToggleButton';
import { ToolboxDualToggleButton } from './buttons/ToolboxDualToggleButton';
import { ToolboxActionButton } from './buttons/ToolboxActionButton';
import { useOvermind } from '../../overmind';
import './Toolbox.css';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';

export function Toolbox(): JSX.Element {
  const { state, actions } = useOvermind();
  return (
    <div className="toolbox">
      <ToolboxToggleButton
        buttonClass="dottedfreehand"
        isSelected={state.toolbox.selectedDrawingToolId === 'dottedFreehand'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('dottedFreehand')}
      />
      <div className="toolbox-button-divider"></div>
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
      <div className="toolbox-button-divider"></div>
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
      <div className="toolbox-button-divider"></div>
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
      <div className="toolbox-button-divider"></div>
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
      <div className="toolbox-button-divider"></div>
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
      <div className="toolbox-button-divider"></div>
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
      <div className="toolbox-button-divider"></div>
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
      <div className="toolbox-button-divider"></div>
      <ToolboxActionButton
        buttonClass="clr"
        onClick={(): void => {
          paintingCanvasController.clear();
          actions.undo.setUndoPoint();
        }}
      />
    </div>
  );
}
