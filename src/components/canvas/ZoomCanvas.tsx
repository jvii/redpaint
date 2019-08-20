import React, { useState, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { useScrollToFocusPoint } from './hooks';

import './Canvas.css';
import { Point } from '../../types';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
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
  const canvasDivRef = useRef<HTMLDivElement>(null);
  const [zoomFactor, setZoomFactor] = useState(20);

  useScrollToFocusPoint(canvasDivRef, zoomFactor, canvasState.zoomFocusPoint);

  const zoom = (newZoomFactor: number): void => {
    if (canvasDivRef === null || canvasDivRef.current === null) {
      return;
    }
    if (newZoomFactor <= 0) {
      return;
    }
    const centerPoint = getCenterPoint(canvasDivRef.current, zoomFactor);
    canvasDispatch({
      type: 'setZoomFocusPoint',
      point: centerPoint,
    });
    setZoomFactor(newZoomFactor);
  };

  const zoomIn = (): void => {
    const newZoomFactor = zoomFactor + 2;
    zoom(newZoomFactor);
  };

  const zoomOut = (): void => {
    const newZoomFactor = zoomFactor - 2;
    zoom(newZoomFactor);
  };

  const visible = toolbarState.zoomModeOn && canvasState.zoomFocusPoint;

  return (
    <>
      <div className="ZoomCanvasSideBar" style={{ display: visible ? 'initial' : 'none' }}>
        <button className="ButtonPlus" onClick={zoomIn}>
          +
        </button>
        <button className="ButtonMinus" onClick={zoomOut}>
          -
        </button>
      </div>
      <div
        className="ZoomCanvasDiv"
        ref={canvasDivRef}
        style={{ display: visible ? 'initial' : 'none' }}
      >
        <Canvas
          canvasDispatch={canvasDispatch}
          canvasState={canvasState}
          toolbarState={toolbarState}
          paletteState={paletteState}
          isZoomCanvas={true}
          zoomFactor={zoomFactor}
        />
      </div>
    </>
  );
}

function getCenterPoint(canvasDiv: HTMLDivElement, zoomFactor: number): Point {
  return {
    x: (canvasDiv.scrollLeft + canvasDiv.clientWidth / 2) / zoomFactor,
    y: (canvasDiv.scrollTop + canvasDiv.clientHeight / 2) / zoomFactor,
  };
}

export default ZoomCanvas;
