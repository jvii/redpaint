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

export function ZoomCanvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
}: Props): JSX.Element {
  return (
    <>
      <div
        className="ZoomCanvasSideBar"
        style={{ display: toolbarState.zoomModeOn ? 'initial' : 'none' }}
      >
        <button className="ButtonPlus">+</button>
        <button className="ButtonMinus">-</button>
      </div>
      <div
        className="ZoomCanvasDiv"
        style={{ display: toolbarState.zoomModeOn ? 'initial' : 'none' }}
      >
        <Canvas
          canvasDispatch={canvasDispatch}
          canvasState={canvasState}
          toolbarState={toolbarState}
          paletteState={paletteState}
          isZoomCanvas={true}
        />
      </div>
    </>
  );
}

export default ZoomCanvas;
