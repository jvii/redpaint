import React, { JSX } from 'react';
import { ToolboxToggleButton } from './buttons/ToolboxToggleButton';
import { ToolboxDualToggleButton } from './buttons/ToolboxDualToggleButton';
import { ToolboxActionButton } from './buttons/ToolboxActionButton';
import { useActions, useAppState } from '../../overmind';
import './Toolbox.css';
import { toolboxHints } from './toolboxHints';

export function Toolbox(): JSX.Element {
  const state = useAppState();
  const actions = useActions();
  return (
    <div className="toolbox">
      <ToolboxToggleButton
        buttonClass="dottedfreehand"
        hint={toolboxHints.dottedFreehand}
        isSelected={state.toolbox.activeToolId === 'dottedFreehand'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('dottedFreehand')}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxToggleButton
        buttonClass="freehand"
        hint={toolboxHints.freehand}
        isSelected={state.toolbox.activeToolId === 'freeHand'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('freeHand')}
      />
      <ToolboxToggleButton
        buttonClass="line"
        hint={toolboxHints.line}
        isSelected={state.toolbox.activeToolId === 'line'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('line')}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxToggleButton
        buttonClass="curve"
        hint={toolboxHints.curve}
        isSelected={state.toolbox.activeToolId === 'curve'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('curve')}
      />
      <ToolboxToggleButton
        buttonClass="floodfill"
        hint={toolboxHints.floodFill}
        isSelected={state.toolbox.activeToolId === 'floodFill'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('floodFill')}
        onRightClick={(): void => {
          actions.toolbox.setSelectedDrawingTool('floodFill');
          actions.fillStyle.openSettings();
        }}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxToggleButton
        buttonClass="airbrush"
        hint={toolboxHints.airbrush}
        isSelected={state.toolbox.activeToolId === 'airbrush'}
        onClick={(): void => actions.toolbox.setSelectedDrawingTool('airbrush')}
      />
      <ToolboxDualToggleButton
        buttonClass="rectangle"
        hint={toolboxHints.rectangle}
        isUpperHalfSelected={state.toolbox.activeToolId === 'rectangleNoFill'}
        isLowerHalfSelected={state.toolbox.activeToolId === 'rectangleFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('rectangleNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('rectangleFilled')}
        onLowerHalfRightClick={(): void => {
          actions.toolbox.setSelectedDrawingTool('rectangleFilled');
          actions.fillStyle.openSettings();
        }}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxDualToggleButton
        buttonClass="circle"
        hint={toolboxHints.circle}
        isUpperHalfSelected={state.toolbox.activeToolId === 'circleNoFill'}
        isLowerHalfSelected={state.toolbox.activeToolId === 'circleFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('circleNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('circleFilled')}
        onLowerHalfRightClick={(): void => {
          actions.toolbox.setSelectedDrawingTool('circleFilled');
          actions.fillStyle.openSettings();
        }}
      />
      <ToolboxDualToggleButton
        buttonClass="ellipse"
        hint={toolboxHints.ellipse}
        isUpperHalfSelected={state.toolbox.activeToolId === 'ellipseNoFill'}
        isLowerHalfSelected={state.toolbox.activeToolId === 'ellipseFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('ellipseNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('ellipseFilled')}
        onLowerHalfRightClick={(): void => {
          actions.toolbox.setSelectedDrawingTool('ellipseFilled');
          actions.fillStyle.openSettings();
        }}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxDualToggleButton
        buttonClass="polygon"
        hint={toolboxHints.polygon}
        isUpperHalfSelected={state.toolbox.activeToolId === 'polygonNoFill'}
        isLowerHalfSelected={state.toolbox.activeToolId === 'polygonFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('polygonNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('polygonFilled')}
        onLowerHalfRightClick={(): void => {
          actions.toolbox.setSelectedDrawingTool('polygonFilled');
          actions.fillStyle.openSettings();
        }}
      />
      <ToolboxToggleButton
        buttonClass="brushselect"
        hint={toolboxHints.brushSelect}
        isSelected={state.toolbox.activeToolId === 'brushSelectorTool'}
        onClick={(): void => actions.toolbox.toggleBrushSelectionMode()}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxDualToggleButton
        buttonClass="text"
        hint={toolboxHints.text}
        isUpperHalfSelected={state.toolbox.activeToolId === 'textNoFill'}
        isLowerHalfSelected={state.toolbox.activeToolId === 'textFilled'}
        onUpperHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('textNoFill')}
        onLowerHalfClick={(): void => actions.toolbox.setSelectedDrawingTool('textFilled')}
      />
      <ToolboxToggleButton
        buttonClass="zoom"
        hint={toolboxHints.zoom}
        isSelected={
          state.toolbox.zoomModeOn || state.toolbox.activeToolId === 'zoomInitialPointSelectorTool'
        }
        onClick={(): void => actions.toolbox.toggleZoomMode()}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxToggleButton
        buttonClass="symmetry"
        hint={toolboxHints.symmetry}
        isSelected={
          state.toolbox.symmetryModeOn ||
          state.toolbox.activeToolId === 'symmetryCenterSelectorTool'
        }
        onClick={(): void => actions.toolbox.toggleSymmetryMode()}
        onRightClick={(): void => actions.symmetry.openSettings()}
      />
      <ToolboxActionButton
        buttonClass="undo"
        hint={toolboxHints.undo}
        onClick={(): void => actions.undo.undo()}
        onRightClick={(): void => actions.undo.redo()}
      />
      <div className="toolbox-button-divider"></div>
      <ToolboxActionButton
        buttonClass="clr"
        hint={toolboxHints.clr}
        // Pixels only — see app.clearPage. Starting a new page is the
        // right-click below.
        onClick={(): void => actions.app.clearPage()}
        onRightClick={(): void => actions.app.newPicture()}
      />
    </div>
  );
}
