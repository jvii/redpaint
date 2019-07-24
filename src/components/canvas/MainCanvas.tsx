import React from 'react';
import { Canvas } from './Canvas';
import { CanvasState, Action } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<Action>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
}

export function MainCanvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
}: Props): JSX.Element {
  return (
    <div className="CanvasDiv">
      <Canvas
        canvasDispatch={canvasDispatch}
        canvasState={canvasState}
        toolbarState={toolbarState}
        paletteState={paletteState}
        isZoomCanvas={false}
      />
    </div>
  );
}

export default MainCanvas;
